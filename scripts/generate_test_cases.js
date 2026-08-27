const fs = require('fs');

const columns = ['Test ID', 'Module', 'Category', 'Field/Feature', 'Scenario', 'Expected Outcome'];
let testIdCounter = 1;
const testCases = [];

// Helper to add rows
const addTestCase = (moduleName, category, feature, scenario, expected) => {
    testCases.push(`"${moduleName}-${testIdCounter++}","${moduleName}","${category}","${feature}","${scenario}","${expected}"`);
};

// Data Definitions
const modules = ['Lead', 'Deal', 'Account', 'Task', 'Product'];

// Vectors
const xssPayloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    '" onmouseover="alert(1)',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '\'><script>alert(1)</script>',
    '<BODY ONLOAD=alert(1)>',
    '<BGSOUND SRC="javascript:alert(1);">',
    '<br size="&{alert(1)}">',
    '<LINK REL="stylesheet" HREF="javascript:alert(1);">',
    '<META HTTP-EQUIV="refresh" CONTENT="0;url=javascript:alert(1);">',
    '<TABLE BACKGROUND="javascript:alert(1)">',
    '<DIV STYLE="background-image: url(javascript:alert(1))">',
    '<DIV STYLE="width: expression(alert(1));">',
    '<OBJECT TYPE="text/x-scriptlet" DATA="http://ha.ckers.org/scriptlet.html"></OBJECT>',
    '<EMBED SRC="http://ha.ckers.org/xss.swf" AllowScriptAccess="always"></EMBED>',
    '<a href="javascript:alert(1)">Click Me</a>',
    '\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',
    '%3Cscript%3Ealert(1)%3C/script%3E'
];

const sqliPayloads = [
    "' OR '1'='1",
    "admin' --",
    "admin' #",
    "' OR 1=1--",
    "1'; DROP TABLE users--",
    "1' OR '1'='1'--",
    "1' OR '1'='1' #",
    "1' OR '1'='1' /*",
    "' OR 1=1#",
    "' OR 1=1/*",
    "admin' AND 1=1--",
    "admin' AND 1=0--",
    "1' UNION SELECT username, password FROM users--",
    "1' OR (SELECT COUNT(*) FROM users) > 0--",
    "1' AND sleep(5)--",
    "1' AND pg_sleep(5)--",
    "1' WAITFOR DELAY '0:0:5'--",
    "'; EXEC xp_cmdshell('dir');--",
    "1' OR EXISTS(SELECT * FROM information_schema.tables)--",
    "' OR 'x'='x"
];

const stringBoundary = [
    'A', // 1 char
    'A'.repeat(50),
    'A'.repeat(255), // Exact limit
    'A'.repeat(256), // Limit + 1
    'A'.repeat(1000), // Huge
    ' ', // single space
    '    ', // multiple spaces
    '', // empty
    'null',
    'undefined',
    'NaN',
    'True',
    'False',
    '0',
    '1'
];

const invalidEmails = [
    'plainaddress',
    '#@%^%#$@#$@#.com',
    '@example.com',
    'Joe Smith <email@example.com>',
    'email.example.com',
    'email@example@example.com',
    '.email@example.com',
    'email.@example.com',
    'email..email@example.com',
    'email@example.com (Joe Smith)',
    'email@example',
    'email@-example.com',
    'email@example..com',
    'Abc..123@example.com',
    '”(),:;<>[\]@example.com'
];

const invalidPhones = [
    'abcdefghij',
    '12345',
    '123-abc-4567',
    '!@#$%^&*()',
    '+1 (555) ABC-DEFG',
    '123456789012345678901234567890',
    '0000000000',
    '9999999999',
    '+00-000-000-0000'
];

const numberVectors = [
    -1,
    -999999,
    0,
    0.00001,
    9999999999,
    'abc',
    '!@#',
    '1.2.3',
    '1e10',
    '10,000'
];

const percentageVectors = [
    -1,
    101,
    150,
    100.1,
    'abc',
    '-50',
    '10%',
    '1000'
];

// Module specific field configs
const moduleFields = {
    'Lead': { text: ['firstName', 'lastName', 'title', 'company'], email: ['email'], phone: ['phone', 'mobile'], date: [] },
    'Deal': { text: ['dealName', 'nextStep', 'notes'], number: ['dealValue', 'weightedValue'], percentage: ['probability'], date: ['expectedCloseDate', 'actualCloseDate'] },
    'Account': { text: ['accountName', 'taxId', 'website', 'primaryContact'], email: ['email'], number: ['teamSize', 'annualRevenue'], subform: ['contactPerson'] },
    'Task': { text: ['taskName', 'description'], date: ['startDateTime', 'dueDateTime'] },
    'Product': { text: ['productName', 'sku', 'description'], number: ['unitPrice', 'costPrice', 'qtyInStock'], image: ['productImages'] }
};

// Generate General UI & API tests
modules.forEach(mod => {
    addTestCase(mod, 'UI', 'Page Load', 'Load module list view page', 'Table renders without errors and shows header columns.');
    addTestCase(mod, 'UI', 'Create Form', 'Click Add button to open create form', 'Form modal/page opens with all required fields visible.');
    addTestCase(mod, 'UI', 'Responsive Layout', 'Resize window to mobile width (375px)', 'Form inputs stack vertically and are fully visible.');
    addTestCase(mod, 'API', 'Create Success', 'Submit form with valid complete payload', 'API returns 201 Created and Success Toast appears.');
    addTestCase(mod, 'API', 'Create Error 500', 'Simulate server crash (500) on submit', 'UI shows Error Toast and preserves user input.');
    addTestCase(mod, 'API', 'Create Error 401', 'Submit form without auth token', 'API returns 401 Unauthorized and user is redirected to Login.');
});

// Procedurally generate field tests
modules.forEach(mod => {
    const fields = moduleFields[mod];
    
    // Text Fields (XSS, SQLi, Boundaries)
    if (fields.text) {
        fields.text.forEach(field => {
            xssPayloads.forEach(payload => addTestCase(mod, 'Security - XSS', field, `Inject XSS: ${payload.replace(/"/g, '""')}`, 'Input sanitized. Script not executed.'));
            sqliPayloads.forEach(payload => addTestCase(mod, 'Security - SQLi', field, `Inject SQL: ${payload.replace(/"/g, '""')}`, 'Input escaped. DB integrity maintained.'));
            stringBoundary.forEach(payload => addTestCase(mod, 'Validation - String', field, `Input boundary string length/type: ${payload}`, 'Validation correctly accepts, truncates, or throws error based on field limit.'));
        });
    }

    // Email Fields
    if (fields.email) {
        fields.email.forEach(field => {
            invalidEmails.forEach(payload => addTestCase(mod, 'Validation - Email', field, `Input invalid email format: ${payload}`, 'Form validation fails. Shows red error text.'));
        });
    }

    // Phone Fields
    if (fields.phone) {
        fields.phone.forEach(field => {
            invalidPhones.forEach(payload => addTestCase(mod, 'Validation - Phone', field, `Input invalid phone format: ${payload}`, 'Form validation fails.'));
        });
    }

    // Number/Currency Fields
    if (fields.number) {
        fields.number.forEach(field => {
            numberVectors.forEach(payload => addTestCase(mod, 'Validation - Number', field, `Input edge number: ${payload}`, 'Handled properly (negative/NaN blocked, large numbers formatted).'));
        });
    }

    // Percentage Fields
    if (fields.percentage) {
        fields.percentage.forEach(field => {
            percentageVectors.forEach(payload => addTestCase(mod, 'Validation - Percentage', field, `Input edge percentage: ${payload}`, 'Range strictly bounded to 0-100. Invalid blocked.'));
        });
    }

    // Date Fields
    if (fields.date) {
        fields.date.forEach(field => {
            addTestCase(mod, 'Validation - Date', field, 'Input leap year date 2024-02-29', 'Accepted successfully.');
            addTestCase(mod, 'Validation - Date', field, 'Input invalid leap year date 2023-02-29', 'Rejected by calendar widget.');
            addTestCase(mod, 'Validation - Date', field, 'Input past date (1900-01-01)', 'Accepted or warned based on logic.');
            addTestCase(mod, 'Validation - Date', field, 'Input future date (2100-12-31)', 'Accepted.');
        });
    }
});

// Specific Workflow Tests
addTestCase('Deal', 'Logic', 'Dates', 'Expected Close Date is set BEFORE Actual Close Date', 'System accepts but highlights discrepancy.');
addTestCase('Account', 'Subform', 'Contact Person', 'Add 50 rows to subform rapidly', 'UI remains stable without lag.');
addTestCase('Account', 'Subform', 'Contact Person', 'Delete all rows from subform', 'Handled gracefully, empty state shown.');
addTestCase('Product', 'Image', 'Upload', 'Upload 5 images', 'Blocked. Max limit is 4.');
addTestCase('Product', 'Image', 'Upload', 'Upload 10MB image', 'Blocked. Exceeds size limit.');
addTestCase('Task', 'Logic', 'Due Date', 'Set Due Date to 5 minutes ago', 'Task automatically marked as Overdue state.');

// Write to CSV
const csvContent = columns.join(',') + '\n' + testCases.join('\n');
fs.writeFileSync('mooncliq_test_cases.csv', csvContent);
console.log(`Generated ${testCases.length} test cases in mooncliq_test_cases.csv`);
