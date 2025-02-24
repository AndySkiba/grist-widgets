  function showError(msg) {
    let el = document.getElementById('error');
    if (!msg) {
      el.style.display = 'none';
    } else {
      el.innerHTML = msg;
      el.style.display = 'block';
    }
  }
  
  function updateDropdown(options) {
    const dropdown = document.getElementById('dropdown');
    dropdown.innerHTML = '';
    if (options.length === 0) {
      const optionElement = document.createElement('option');
      optionElement.textContent = 'No options available';
      dropdown.appendChild(optionElement);
    } else {
      options.forEach((option, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = String(index);
        optionElement.textContent = String(option);
        dropdown.appendChild(optionElement);
      });
    }
  }
  
  let selectedId = -1;

  function initGrist() {
    grist.ready({
      columns: [{ name: "OptionsToSelect", title: 'Options to select', type: 'Any' }],
      requiredAccess: 'read table',
      allowSelectBy: true,
    });
  
    let allRecords = [];
  
    grist.onRecords(function (records) {
      if (!records || records.length === 0) {
        showError("No records received");
        updateDropdown([]);
        return;
      }
      
      allRecords = records;
      const mapped = grist.mapColumnNames(records);
  
      showError("");
      const options = mapped.map(record => record.OptionsToSelect).filter(option => option !== null && option !== undefined);
      
      if (options.length === 0) {
        showError("No valid options found");
      }
      updateDropdown(options);
    });
  
    grist.onRecord(function (record) {
      const mapped = grist.mapColumnNames(record);
      const dropdown = document.getElementById('dropdown');
      const index = allRecords.findIndex(r => r.id === record.id);
      if (index !== -1) {
        dropdown.value = String(index);
      }
    });
  
    document.getElementById('dropdown').addEventListener('change', function(event) {
      const selectedIndex = parseInt(event.target.value);
      const selectedRecord = allRecords[selectedIndex];
      if (selectedRecord) {
        grist.setCursorPos({rowId: selectedRecord.id});
        grist.setOption("selected", selectedRecord.id);
      }
    });

    console.log("getOption called");
    grist.getOption("selected").then(function (selected){
        
        console.log("Option received " + selected);
        grist.setCursorPos({rowId: selected});
        selectedId = selected;

        const index = allRecords.findIndex(r => r.id === selected);
        console.log("Selected index is " + index);
        
        const dropdown = document.getElementById('dropdown');
        dropdown.value = index;
     })
  }
  
  document.addEventListener('DOMContentLoaded', initGrist);