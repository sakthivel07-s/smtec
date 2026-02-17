// ==========================================
// SMTEC Google Sheets Bridge (Multi-Sheet Sync - EXACT MATCH)
// ==========================================

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const action = e.parameter.action || "read";

        // Mapping dictionary to match user's spreadsheet image
        const headerMap = {
            "REG.NO": "regNo",
            "REG NO": "regNo",
            "Name of Student": "name",
            "Name": "name",
            "Dept": "dept",
            "PS-Portal Marks": "psPortal",
            "Other Activities Marks": "otherSkills",
            "TOTAL": "totalPoints"
        };

        // 1. READ (Pull to Website)
        if (action === "read") {
            const sheets = ss.getSheets();
            let allStudents = [];

            sheets.forEach(sheet => {
                const sheetName = sheet.getName();
                const data = sheet.getDataRange().getValues();
                const headers = data[0] || [];
                
                // Helper to find column index by flexible name
                const findCol = (terms) => {
                    return headers.findIndex(h => {
                        const cleanH = String(h).toLowerCase().replace(/[-_ ]/g, '');
                        return terms.some(t => cleanH.includes(t.toLowerCase().replace(/[-_ ]/g, '')));
                    });
                };

                const psIndex = findCol(['PSPORTAL', 'PS-PORTAL', 'PS PORTAL']);
                const otherIndex = findCol(['OtherActivities', 'OtherSkills', 'Other Activities']);
                const totalIndex = findCol(['TOTAL']);
                const regNoIndex = findCol(['REGNO', 'REGISTER', 'REG.NO']);

                // Extract Dept and Year from sheet name
                const nameParts = sheetName.split(/[- ]/);
                const sheetDept = nameParts[0];
                const sheetYear = nameParts[1] || "1";

                if (data.length > 1) {
                    const rows = data.slice(1);
                    const jsonData = rows.map((row, i) => {
                        if (!row[regNoIndex]) return null;

                        let obj = {
                            dept: sheetDept,
                            year: Number(sheetYear)
                        };
                        
                        // Calculated Math
                        let calculatedTotal = 0;
                        
                        // Sum PS Portal
                        if (psIndex !== -1 && row[psIndex]) {
                            const val = String(row[psIndex]);
                            val.split(',').forEach(p => calculatedTotal += (parseInt(p.trim()) || 0));
                        }
                        
                        // Sum Other Activities
                        if (otherIndex !== -1 && row[otherIndex]) {
                            const val = String(row[otherIndex]);
                            val.split(',').forEach(p => {
                                if (p.includes('=')) {
                                    calculatedTotal += (parseInt(p.split('=')[1].trim()) || 0);
                                } else {
                                    const v = p.trim().split(/\s+/).pop();
                                    calculatedTotal += (parseInt(v) || 0);
                                }
                            });
                        }

                        // Write back to sheet if TOTAL column exists
                        if (totalIndex !== -1 && row[totalIndex] !== calculatedTotal) {
                            sheet.getRange(i + 2, totalIndex + 1).setValue(calculatedTotal);
                        }

                        headers.forEach((header, index) => {
                            if (!header) return;
                            const dbField = headerMap[header] || header;
                            obj[dbField] = index === totalIndex ? calculatedTotal : row[index];
                        });

                        return obj;
                    }).filter(s => s && s.regNo);
                    
                    allStudents = allStudents.concat(jsonData);
                }
            });

            return createJSON({ status: "success", data: allStudents });
        }

        // 2. WRITE (Push from Website)
        else if (action === "write") {
            const requestData = JSON.parse(e.postData.contents);
            const students = requestData.students;

            if (!students || students.length === 0) return createError("No data");

            students.forEach(student => {
                const dept = student.dept || "Unknown";
                const year = student.year || "1";
                const sheetName = `${dept} ${year}`; // Matching "CSE 1" format
                
                let sheet = ss.getSheetByName(sheetName);
                if (!sheet) {
                    sheet = ss.insertSheet(sheetName);
                    const defaultHeaders = ["SI.No.", "REG.NO", "Dept", "Name of Student", "PS-Portal Marks", "Other Activities Marks", "TOTAL"];
                    sheet.appendRow(defaultHeaders);
                }

                const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
                const regNoIndex = headers.indexOf("REG.NO");
                
                // Inverse Mapping for Write
                const invMap = {};
                Object.keys(headerMap).forEach(k => invMap[headerMap[k]] = k);

                const rowData = headers.map(header => {
                    const dbField = headerMap[header] || header;
                    return student[dbField] !== undefined ? student[dbField] : "";
                });

                const data = sheet.getDataRange().getValues();
                let rowIndex = -1;
                for (let i = 1; i < data.length; i++) {
                    if (String(data[i][regNoIndex]) === String(student.regNo)) {
                        rowIndex = i + 1;
                        break;
                    }
                }

                if (rowIndex > 0) {
                    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
                } else {
                    sheet.appendRow(rowData);
                }
            });

            return createJSON({ status: "success", message: "Synced to " + students.length + " records" });
        }

        // 3. DELETE
        else if (action === "delete") {
            const regNo = e.parameter.regNo;
            const sheets = ss.getSheets();
            let deleted = false;

            sheets.forEach(sheet => {
                const data = sheet.getDataRange().getValues();
                const headers = data[0];
                const regNoIndex = headers.indexOf("REG.NO") !== -1 ? headers.indexOf("REG.NO") : headers.indexOf("regNo");
                
                if (regNoIndex !== -1) {
                    for (let i = 1; i < data.length; i++) {
                        if (String(data[i][regNoIndex]) === String(regNo)) {
                            sheet.deleteRow(i + 1);
                            deleted = true;
                        }
                    }
                }
            });

            return createJSON({ status: "success", message: deleted ? "Deleted" : "Not found" });
        }

        return createError("Invalid action");

    } catch (e) {
        return createError(e.toString());
    } finally {
        lock.releaseLock();
    }
}

function createJSON(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function createError(msg) {
    return createJSON({ status: "error", message: msg });
}
