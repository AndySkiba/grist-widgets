// Таблицы которые игнорируем
const IGNORE_TABLES = ["Entities", 
  "EntityClasses", 
  "ExportBehaviors", 
  "ExportBuckets", 
  "ExportMaps", 
  "ExportProps", 
  "ExportLangs", 
  "ExportTables", 
  "ExportTargets",
  "ExportTypes",
  "ExportCols"];

const REMOVE = "RemoveRecord";
const UPDATE = "UpdateRecord";
const INSERT = "AddRecord";
const IGNORE = null;

async function doJob()
{
  const st = document.getElementById('status');

  // Получаем данные из таблиц гриста
  st.textContent = "staring job...";
  const tables = await grist.docApi.fetchTable("_grist_Tables");
  st.textContent = "got " + tables.id.length +" tables...";
  
  const cols = await grist.docApi.fetchTable("_grist_Tables_column");
  st.textContent = "got " + cols.id.length + " columns... ";

  const extables = await grist.docApi.fetchTable("ExportTables");
  st.textContent = "got " + extables.id.length +" existing tables...";

  const excols = await grist.docApi.fetchTable("ExportCols");
  st.textContent = "got " + excols.id.length +" existing columns...";

  const tablemap = {};
  // Создаем словарь содержащий данные о таблицах
  st.textContent = "Creating existing table map...";
  for(let i = 0; i < extables.id.length; i++)
  {
    tablemap[extables.Idx[i]] = {
      id : extables.id[i],
      data: {
        Name : extables.Name[i],
        Idx : extables.Idx[i],
        IsBehavior : extables.IsBehavior[i]
      },
      action : REMOVE
    }
  }

  const colmap = {};
  // Создаем словарь содержащий данные о столбцах
  st.textContent = "Creating existing row map...";
  for(let i = 0; i < excols.id.length; i++)
  {
    colmap[excols.Idx[i]] = {
      id : excols.id[i],
      data: {
        Table: excols.Table[i],
        Name : excols.Name[i],
        Type : excols.Type[i],
        Idx : excols.Idx[i]
      },
      action : REMOVE
    }
  }

  // Определяем изменения которые необходимо применить к таблице ExportTables
  for(let i = 0; i < tables.id.length; i++)
  {
    if (IGNORE_TABLES.includes(tables.tableId[i]))
      continue;
    
    const targetTableIdx = tables.id[i];
    if (tablemap.hasOwnProperty(targetTableIdx))
    {
      let item = tablemap[targetTableIdx];
      item.action = IGNORE;

      if(item.data.Name == tables.tableId[i])
        continue;
      
      item.action = UPDATE;
      item.data.Name = tables.tableId[i];
    }
    else
    {
      tablemap[targetTableIdx] = {
        id : null,
        data : {
          Name : tables.tableId[i],
          Idx : tables.id[i],
          IsBehavior : false
        },
        action : INSERT
      }
    }
  }

  // Определяем изменения которые необходимо применить к таблице ExportCols
  for(let i = 0; i < cols.id.length; i++)
  {
    // Пропускаем специальные значения гриста
    if (cols.colId[i] == "manualSort" 
    || cols.colId[i].startsWith("gristHelper_Display"))
      continue;

    // Если такой таблицы нет в нашем списке или мы её удаляем
    if (!tablemap.hasOwnProperty(cols.parentId[i])
    || tablemap[cols.parentId[i]].action == REMOVE)
      continue;
    
    // Если какое либо из значений изменилось или поле новое 
    const targetColIdx = cols.id[i];
    if (colmap.hasOwnProperty(targetColIdx))
    {
      let item = colmap[targetColIdx];
      item.action = IGNORE;

      if(item.data.Name == cols.colId[i]
       && item.data.Type == cols.type[i]
       && item.data.Table == tablemap[cols.parentId[i]].id)
        continue;
      
      item.action = UPDATE;
      item.data.Name = cols.colId[i];
      item.data.Type = cols.type[i];
      item.data.Table = tablemap[cols.parentId[i]].id;
    }
    else
    {
      colmap[targetColIdx] = {
        id : null,
        data : {
          Table: tablemap[cols.parentId[i]].id,
          Name : cols.colId[i],
          Type : cols.type[i],
          Idx : cols.id[i]
        },
        action : INSERT
      }
    }
  }

  // Применяем изменения к таблице ExportTables
  let actions = [];
  for(let idx in tablemap)
  {
    let item = tablemap[idx];
    if (item.action == IGNORE)
      continue;

    let action = [item.action, "ExportTables", item.id];
    if (item.action != REMOVE)
      action.push(item.data);
    actions.push(action);
  }

  // Применяем изменения к таблице ExportCols
  for(let idx in colmap)
  {
    let item = colmap[idx];
    if (item.action == IGNORE)
      continue;

    let action = [item.action, "ExportCols", item.id];
    if (item.action != REMOVE)
      action.push(item.data);
    actions.push(action);
  }

  await grist.docApi.applyUserActions(actions);

  st.textContent = "Done!";
}

function initGrist() {
    // Ждем, пока Grist будет готов
    const st = document.getElementById('status');
    st.textContent = "init...";
    grist.ready({ requiredAccess: 'full' });
    st.textContent = "ready...";

    doJob();
}

document.addEventListener('DOMContentLoaded', initGrist);
