import * as XLSX from 'xlsx';

export function downloadSampleTemplate() {
    const headers = [
        ["regNo", "name", "email", "dept", "year", "cgpa"]
    ];

    const sampleData = [
        ["91001", "Alice Smith", "alice@smtec.edu", "CSE", 3, 8.5],
        ["91002", "Bob Jones", "bob@smtec.edu", "MECH", 2, 7.2]
    ];

    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");

    XLSX.writeFile(wb, "smtec_student_template.xlsx");
}
