'use strict';

// Путь к файлу с данными
const dataPath = '/data/data.json';

// Основной компонент managed-table
const managedTable = document.querySelector('.body__managed-table');

// Управление, таблица, пагинация, модальное окно
const control = managedTable.querySelector('.managed-table__control'),
    table = managedTable.querySelector('.managed-table__table'),
    pagination = managedTable.querySelector('.managed-table__pagination'),
    modal = managedTable.querySelector('.managed-table__modal');

// Кеширование данных для таблицы, скрытые колонки
let tableData = [];
let hiddenColumns = [];

/*
 * countRows - текущее количество строк
 * countPages - текущее количество страниц
 * selectedPage - текущая страница
 * selectedRow - текущая строка
 * sortColumn - текущий столбец для сортировки
 * sortOrder - текущее направление сортировки
 * shownPages - количество страниц для показа
*/
let countRows = 0,
    countPages = 1,
    selectedPage = 1,
    selectedRow = null,
    sortColumn = null,
    sortOrder = 1,
    shownPages = 10;

// Обработчик кнопки добавление новой строки
control.querySelector('.managed-table__button_add').addEventListener('click', () => {

    if (selectedRow !== null) {
        return;
    }

    openModal(null, null, 'Add row');
});

// Обработчик кнопки загрузки данных с файла
control.querySelector('.managed-table__button_upload').addEventListener('click', () => {
    let data = uploadData(dataPath);

    if (data) {
        parseData(data);
    }
});

// Обработчик кнопки очистки таблицы
control.querySelector('.managed-table__button_clear').addEventListener('click', () => {

    if (tableData.length == 0) {
        return;
    }

    hiddenColumns.forEach(item => showColumn(item));
    hiddenColumns = [];

    clearTable();

    disableSort();

    [countRows, sortOrder, sortColumn, countPages] = [0, 1, null, 1];

    tableData = [];

    showNoDataText();

    updatePagination(1);
});

// Обработчик кнопки показа скрытых столбцов
control.querySelector('.managed-table__button_refresh').addEventListener('click', () => {

    hiddenColumns.forEach(item => showColumn(item));
    hiddenColumns = [];
});

// Обработчик кнопки сортировки таблицы
table.querySelectorAll('.table__button_sort')
    .forEach((item, index) => item.addEventListener('click', () => {

        if (tableData.length == 0) {
            return;
        }

        sortTable(index);
    }));

// Обработчик кнопки скрытия столбца
table.querySelectorAll('.table__button_hide')
    .forEach((item, index) => item.addEventListener('click', () => {

        if (tableData.length == 0) {
            return;
        }

        hiddenColumns.push(index);
        hideColumn(index);
    }));

// Обработчик кнопки подтверждения изменений строки
modal.querySelector('.modal__button_apply')
    .addEventListener('click', () => applyEditsRow(selectedRow));

// Обработчик кнопки отмены изменений строки
modal.querySelector('.modal__button_cancel')
    .addEventListener('click', () => closeModal());

// Обработчик закрытия модального окна
modal.addEventListener('click', () => closeModal());
modal.querySelector('.modal__content')
    .addEventListener('click', e => e.stopPropagation());

// Обработчик кнопки перелистывания страницы влево
pagination.querySelector('.managed-table__button_page_left').addEventListener('click', () => {

    if (selectedPage == 1) {
        return;
    }

    clearTable();

    updatePagination(selectedPage - 1);

    const from = selectedPage == 1 ? 0 : (selectedPage - 1) * shownPages;
    const to = from + shownPages;

    showSliceTableRows(from, to);
});

// Обработчик кнопки перелистывания страницы вправо
pagination.querySelector('.managed-table__button_page_right').addEventListener('click', () => {

    if (selectedPage == countPages) {
        return;
    }

    clearTable();

    updatePagination(selectedPage + 1);

    const from = selectedPage == 1 ? 0 : (selectedPage - 1) * shownPages;
    const to = from + shownPages;

    showSliceTableRows(from, to);
});

// Скрытие текста "No data available"
function hideNoDataText() {
    managedTable
        .querySelector('.managed-table__no-data').classList.add('none');
}

// Показ текста "No data available"
function showNoDataText() {
    managedTable
        .querySelector('.managed-table__no-data').classList.remove('none');
}

// Отключение сортировки, обновление состояния кнопок сортировки
function disableSort() {

    if (sortColumn === null) {
        return;
    }

    sortOrder == 1
        ? sortColumn.querySelector('.table__button_sort')
            .classList.remove('table__button_sort_down')
        : sortColumn.querySelector('.table__button_sort')
            .classList.remove('table__button_sort_up');

    sortColumn = null;
}

// Создание ячейки таблицы
// value - текст ячейки, classWrapper - класс обертка для контейнера
function createTableCell(value, ...classWrapper) {

    let newCell = document.createElement('td');
    newCell.classList.add('table__td');

    let wrapper = document.createElement('div');
    wrapper.classList.add(...classWrapper);

    wrapper.innerText = value;
    newCell.appendChild(wrapper);

    return newCell;
}

// Создание строки таблицы
// values - текст для ячеек строки
function createTableRow(values) {

    let newRow = document.createElement('tr');
    newRow.classList.add('table__tr');

    newRow.appendChild(
        createTableCell(values[0], 'table__wrapper_td'));
    newRow.appendChild(
        createTableCell(values[1], 'table__wrapper_td'));
    newRow.appendChild(
        createTableCell(values[2], 'table__wrapper_td', 'table__wrapper_about'));
    newRow.appendChild(
        createTableCell(values[3], 'table__wrapper_td', values[3]));

    newRow.addEventListener('click', ({ currentTarget: row }) => {

        let values = Array.from(row.querySelectorAll('div'))
            .map(item => item.innerText);

        openModal(row, values, 'Edit row');
    });

    return newRow;
}

// Добавить строку в DOM-дерево
function showTableRow(values) {

    const tbody = table.querySelector('.table__tbody');
    tbody.appendChild(createTableRow(values));
}

// Вывести строки из кеша в DOM-дерево
function showSliceTableRows(from = 0, to = shownPages) {

    tableData.slice(from, to)
        .forEach(item => showTableRow(item));

    hiddenColumns.forEach(item => hideColumn(item));
}

// Обновить пагинацию и 
// состояние глобальных переменных (countRows, selectedPage, countPages)
function updatePagination(current = selectedPage) {

    countRows = tableData.length;

    selectedPage = current;

    if (countRows > shownPages) {
        countPages = Math.ceil(countRows / shownPages); // !
    } else {
        countPages = 1;
    }

    pagination.querySelector('.managed-table__page-number')
        .innerText = selectedPage + '/' + countPages;
}

// Очистить тело таблицы
function clearTable() {

    const tbody = table.querySelector('.table__tbody');

    while (tbody.firstChild) {
        tbody.removeChild(tbody.lastChild);
    }
}

// Загрузить данные из файла
function uploadData(path) {

    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send(null);
    let data = JSON.parse(request.responseText);

    return data;
}

// Распарсить объект для таблицы
function parseData(data) {

    if (!Array.isArray(data)) {
        return;
    }

    if (tableData.length == 0) {
        hideNoDataText();
    }

    clearTable();

    data.map((obj) => {

        if (typeof obj !== 'object') {
            return;
        }

        const values =
            [obj['name']?.['firstName'], obj['name']?.['lastName'], obj['about'], obj['eyeColor']];

        tableData.push(values);
    });

    updatePagination(selectedPage);
    showSliceTableRows((selectedPage - 1) * shownPages, selectedPage * shownPages);
}

// Сортировка с учетом порядка
function sortTable(index) {

    disableSort();

    const ths = table.querySelectorAll('.table__th');

    sortOrder == 1
        ? ths[index].querySelector('.table__button_sort')
            .classList.add('table__button_sort_up')
        : ths[index].querySelector('.table__button_sort')
            .classList.add('table__button_sort_down');

    tableData.sort((a, b) => {
        let str1 = a[index].toLowerCase();
        let str2 = b[index].toLowerCase();

        if (str1 > str2) {
            return sortOrder == 1 ? 1 : -1;
        } else if (str1 < str2) {
            return sortOrder == 1 ? -1 : 1;
        }

        return 0;
    });

    updatePagination(1);

    sortColumn = ths[index];
    sortOrder *= -1;

    clearTable();
    showSliceTableRows();
}

// Получить массив значений классов полей ввода модального окна
function getInputNamesArray() {
    return ['modal__input_first-name', 'modal__input_last-name',
        'modal__textarea_about', 'modal__input_eye-color'];
}

// Закрыть модальное окно
// Возвращает массив значений полей ввода модального окна на момент закрытия
function closeModal() {

    modal.classList.remove('modal_active');

    selectedRow = null;

    let inputs = getInputNamesArray()
        .map(name => modal.querySelector('.' + name));

    let values = inputs.map(input => input.value);

    inputs.map(input => input.value = '');

    return values;
}

// Открыть модальное окно
// row - строка для редактирования. Если row == null, то создается новая строка
// values - значения для полей ввода. values == null при row == null
// modalName - название модального окна
function openModal(row, values, modalName) {

    modal.classList.add('modal_active');

    modal.querySelector('.modal__name').innerText = modalName;

    selectedRow = row;

    if (values === null) {
        return;
    }

    let inputs = getInputNamesArray()
        .map(name => modal.querySelector('.' + name));

    inputs.map((input, index) => input.value = values[index]);
}

// Применение изменений строки
function applyEditsRow(row) {

    disableSort();

    if (tableData.length == 0) {
        hideNoDataText();
    }

    let values = closeModal();

    if (row) {
        const tbody = table.querySelector('.table__tbody');
        const index = Array.from(tbody.querySelectorAll('.table__tr')).indexOf(row);
        tableData[index] = values;

        row.querySelectorAll('div')
            .forEach((item, index) => {

                if (index == 3) {
                    item.classList.remove(item.innerText);
                    item.classList.add(values[index]);
                }

                item.innerText = values[index];
            });
    } else {
        tableData.push(values);
        updatePagination();
        clearTable();
        showSliceTableRows();
    }
}

// Скрыть столбец
function hideColumn(index) {

    table.querySelectorAll('.table__th')[index].classList.add('none');

    table.querySelector('.table__tbody')
        .querySelectorAll('.table__tr').forEach(item => {
            item.querySelectorAll('.table__td')[index].classList.add('none');
        });
}

// Показать столбец
function showColumn(index) {

    table.querySelectorAll('.table__th')[index].classList.remove('none');

    table.querySelector('.table__tbody')
        .querySelectorAll('.table__tr').forEach(item => {
            item.querySelectorAll('.table__td')[index].classList.remove('none');
        });
}