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

        if (action === "read") {
            // READ DATA (Pull to Website)
            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const rows = data.slice(1);

            const jsonData = rows.map(row => {
                let obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });

            return ContentService.createTextOutput(JSON.stringify({ status: "success", data: jsonData }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        else if (action === "write") {
            // WRITE DATA (Push from Website)
            const requestData = JSON.parse(e.postData.contents);
            const students = requestData.students; // Array of student objects

            if (!students || students.length === 0) {
                return createError("No student data provided");
            }

            // Get existing headers or create them if empty
            let headers = [];
            if (sheet.getLastRow() === 0) {
                headers = ["regNo", "name", "email", "dept", "year", "cgpa"];
                sheet.appendRow(headers);
            } else {
                headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            }

            // Map existing rows by regNo for updating
            const existingData = sheet.getDataRange().getValues();
            const regNoIndex = headers.indexOf("regNo");

            if (regNoIndex === -1) return createError("Sheet missing 'regNo' column");

            // Update or Append
            students.forEach(student => {
                let rowIndex = -1;

                // Find existing row
                for (let i = 1; i < existingData.length; i++) {
                    if (String(existingData[i][regNoIndex]) === String(student.regNo)) {
                        rowIndex = i + 1; // 1-based index
                        break;
                    }
                }

                const rowData = headers.map(header => student[header] || "");

                if (rowIndex > 0) {
                    // Update existing row
                    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
                } else {
                    // Append new row
                    sheet.appendRow(rowData);
                }
            });

            return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data synced to sheet" }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        return createError("Invalid action");

    } catch (e) {
        return createError(e.toString());
    } finally {
        lock.releaseLock();
    }
}

function createError(msg) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: msg }))
        .setMimeType(ContentService.MimeType.JSON);
}
