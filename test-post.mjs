const test = async () => {
  const res = await fetch("http://localhost:3000/api/fields", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blueprintId: "fa627807-3919-4185-a507-1678dfca3b67",
      name: "testFieldXYZ",
      label: "Test Field XYZ",
      type: "text",
      sectionName: "General Information",
      sectionOrder: 0
    })
  });
  const data = await res.json();
  console.log("POST /api/fields response:", data);
};
test();
