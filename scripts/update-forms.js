const fs = require('fs');

const forms = ['LeadIntakeForm.js', 'DealIntakeForm.js', 'AccountIntakeForm.js', 'TaskIntakeForm.js'];

forms.forEach(form => {
  const file = 'src/components/' + form;
  let content = fs.readFileSync(file, 'utf8');

  // Add standardFieldStates to useClientScripts destructuring
  if (!content.includes('standardFieldStates } = useClientScripts')) {
    content = content.replace('const { executeScript } = useClientScripts', 'const { executeScript, standardFieldStates } = useClientScripts');
  }

  // Update visibleFields filter
  content = content.replace(
    /const visibleFields = blueprint\.fields\.filter\(f => !f\.isHidden\);/,
    'const visibleFields = blueprint.fields.filter(f => !f.isHidden && !standardFieldStates?.[f.name]?.isHidden);'
  );

  // Update sectionFields.map
  if (!content.includes('const stateOverride = standardFieldStates?.[field.name]')) {
    content = content.replace(
      /{sectionFields\.map\(field => \(\s*<DynamicField/g,
      `{sectionFields.map(field => {
                          const stateOverride = standardFieldStates?.[field.name];
                          const modifiedField = {
                            ...field,
                            isRequired: stateOverride?.isRequired !== undefined ? stateOverride.isRequired : field.isRequired
                          };
                          return (
                            <DynamicField`
    );

    content = content.replace(
      /field=\{field\}/g,
      'field={modifiedField}'
    );

    content = content.replace(
      /onChange=\{\(name, value, record, mappings\) => handleFieldChange\(field, name, value, record, mappings\)\}\s*\/>\s*\)\)}/g,
      'onChange={(name, value, record, mappings) => handleFieldChange(field, name, value, record, mappings)}\n                            />\n                          );\n                        })}'
    );
  }

  fs.writeFileSync(file, content);
  console.log('Updated ' + form);
});
