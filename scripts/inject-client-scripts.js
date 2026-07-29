const fs = require('fs');

function updateForm(file, moduleType) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('useClientScripts')) return;

  // Add import
  content = content.replace(
    'import DynamicField from "./FieldRegistry";',
    'import DynamicField from "./FieldRegistry";\nimport useClientScripts from "@/hooks/useClientScripts";'
  );

  // Add hook definition
  content = content.replace(
    'const [customData, setCustomData] = useState({});',
    `const [customData, setCustomData] = useState({});\n\n  const { executeScript } = useClientScripts({\n    moduleType: "${moduleType}",\n    standardData, setStandardData,\n    customData, setCustomData,\n    blueprint, setBlueprint\n  });`
  );

  // Add onLoad trigger
  content = content.replace(
    'setBlueprint(data);',
    'setBlueprint(data);\n      setTimeout(() => executeScript("onLoad"), 0);'
  );

  // Add onChange trigger
  content = content.replace(
    'setCustomData((prev) => ({ ...prev, [name]: value }));\n    }',
    'setCustomData((prev) => ({ ...prev, [name]: value }));\n    }\n\n    setTimeout(() => executeScript("onChange", name), 0);'
  );

  // Add onSave trigger
  content = content.replace(
    'const handleSubmit = (e) => {\n    e.preventDefault();',
    'const handleSubmit = (e) => {\n    e.preventDefault();\n    if (!executeScript("onSave")) return;'
  );

  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
}

updateForm('src/components/ProductIntakeForm.js', 'Product');
updateForm('src/components/LeadIntakeForm.js', 'Lead');
updateForm('src/components/DealIntakeForm.js', 'Deal');
updateForm('src/components/AccountIntakeForm.js', 'Account');
updateForm('src/components/TaskIntakeForm.js', 'Task');
