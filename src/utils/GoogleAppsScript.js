// ==========================================
// SMTEC Google Sheets Bridge (Two-Way Sync)
// ==========================================
// 1. Paste this code into Extensions > Apps Script
// 2. Click Deploy > New Deployment
// 3. Select type: "Web App"
// 4. Set "Who has access" to: "Anyone" (Important!)
// 5. Click Deploy and copy the "Web App URL"
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
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; // First sheet
        const action = e.parameter.action || "read";

        // 1. READ (Pull to Website)
        if (action === "read") {
            const data = sheet.getDataRange().getValues();
            if (data.length === 0) return createJSON({ status: "success", data: [] });

            const headers = data[0];
            const rows = data.slice(1);

            const jsonData = rows.map(row => {
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });

            return createJSON({ status: "success", data: jsonData });
        }

        // 2. WRITE (Push from Website - Create/Update)
        else if (action === "write") {
            const requestData = JSON.parse(e.postData.contents);
            const students = requestData.students;

            if (!students || students.length === 0) return createError("No data");

            // Setup Headers
            let headers = [];
            if (sheet.getLastRow() === 0) {
                // Default headers for new sheet
                headers = ["regNo", "name", "email", "dept", "year", "cgpa", "skillPoints"];
                sheet.appendRow(headers);
            } else {
                headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

                // Check for new columns in the first student object
                const firstStudent = students[0];
                const newColumns = [];
                Object.keys(firstStudent).forEach(key => {
                    // Ignore internal fields or large objects if any
                    if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && !headers.includes(key)) {
                        // For now, let's explicitly only add 'skillPoints' to be safe, 
                        // or just add any scalar value.
                        if (key === 'skillPoints') {
                            newColumns.push(key);
                        }
                    }
                });

                if (newColumns.length > 0) {
                    // Add new columns to the sheet
                    const startCol = headers.length + 1;
                    sheet.getRange(1, startCol, 1, newColumns.length).setValues([newColumns]);
                    headers = [...headers, ...newColumns]; // Update local headers array
                }
            }

            const regNoIndex = headers.indexOf("regNo");
            if (regNoIndex === -1) return createError("Missing 'regNo' column");

            const existingData = sheet.getDataRange().getValues();

            students.forEach(student => {
                let rowIndex = -1;
                // Find existing
                for (let i = 1; i < existingData.length; i++) {
                    if (String(existingData[i][regNoIndex]) === String(student.regNo)) {
                        rowIndex = i + 1;
                        break;
                    }
                }

                const rowData = headers.map(header => {
                    // Handle skillPoints specifically if needed, or just generic
                    return student[header] !== undefined ? student[header] : "";
                });

                if (rowIndex > 0) {
                    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
                } else {
                    sheet.appendRow(rowData);
                }
            });

            return createJSON({ status: "success", message: "Synced" });
        }

        // 3. DELETE (Delete from Website -> Delete in Sheet)
        else if (action === "delete") {
            const regNo = e.parameter.regNo;
            if (!regNo) return createError("Missing regNo");

            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const regNoIndex = headers.indexOf("regNo");

            if (regNoIndex === -1) return createError("Missing 'regNo' column");

            for (let i = 1; i < data.length; i++) {
                if (String(data[i][regNoIndex]) === String(regNo)) {
                    sheet.deleteRow(i + 1);
                    return createJSON({ status: "success", message: "Deleted" });
                }
            }

            return createJSON({ status: "success", message: "Not found, but considered deleted" });
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
