const path = require('path');

// === ХРАНИЛИЩЕ СЕЛЕКТОРОВ ===
const SELECTORS_CATALOG = {
    // Общие
    Passim:{
    sidePanelIframe: '.side-panel-iframe',
    },

    CRM:{
    teamMembersButton: '#bx_left_menu_4129730737 > a',
    createButton: '#uiToolbarContainer > div.ui-toolbar-after-title-buttons > div > a',
    deletedMessage: 'text="Deal was deleted, or the URL is incorrect."',

    Deal:{ 
    // Верхняя панель
     gear: 'button[class="ui-btn ui-btn-light-border ui-btn-themes ui-btn-icon-setting crm-entity-actions-button-margin-left ui-btn-themes"]',
     menuPopupItems: 'div[class = "menu-popup-items"]',
     deleteItem: 'text="Delete"',
     continueItem: 'text="Continue"',
    }
    },

    Helpdesk: {
        searchFilterBar: 'input[placeholder = "Filter and search"]',
        addField: '.main-ui-filter-field-add-item',
        findField: 'input[placeholder = "Find field"]',
        idLabel: 'label[title="ID"] input[type="checkbox"]',
        //idCheckboxInput: 'input[id*="ID"]', // Частичное совпадение ID
        applyButton: 'button[class = "ui-btn ui-btn-primary"]',
        typeID: 'input[name="ID"]',
        searchFilterButton: 'button[class = "ui-btn ui-btn-primary ui-btn-icon-search main-ui-filter-field-button main-ui-filter-find"]', 
        gridOpenButton: 'a.main-grid-row-action-button',
        viewDealOption: 'span[title = "View deal"]'
    },

    TicketPanel: {
        // Назначение Assignee
        stageAssignee: 'div[data-id="C9:UC_MS1A7D"]',
        addUserLink: 'a[id^="add_user_UF_CRM_1631802843"]', // id кнопки начинается с...
        userSearchBar: '.feed-add-destination-inp', 
        saveUserButton: 'span[class= "ui-btn ui-btn-primary"]',
        taskLink: 'a[href*="/workgroups/group/86/tasks/task/view"]', // Ссылка на задачу

        // Поля редактирования
        googleAccountField: 'div[data-cid= "UF_CRM_1675742937161"] [class= "ui-entity-editor-content-block"]',
        googleAccount: 'input[name="UF_CRM_1675742937161"]',
        saveFieldButton: 'button[title="[Ctrl+Enter]"]',

        // Лицензии
        licensesTab: '#crm_scope_detail_custom_deal_9_2_tab_licenses',
        licensesTabContent: 'div[data-id="tab_licenses"]',
        licenseCheckbox: 'div[data-tab-id="tab_licenses"]  .ui-form-row input[type="checkbox"]',

        // Закрытие сделки
        notification: '.ui-notification-manager-browser-content',
        stageClose: 'div[data-id="C9:WON"]',
        colorIndicator: 'div[data-base-color]', // Для проверки закрытия тикета
        completePopupBtn: 'div[id="entity_progress_TERMINATION"] .webform-small-button-text', // Кнопка Complete
        
        // Тайм трекер
        hoursInput: '.time-tracker-row input[name="hours"]',
        timeInput: '.time-tracker-row input[name="time"]',
        commentTextarea: '.time-tracker-row textarea[name="comment"]',
        saveTimeButton: 'span.ui-btn.ui-btn-primary',

        // Чек-лист (Внутри второго фрейма)
    checklistPanel: {
        checklistFlag: '.tasks-checklist-item-flag',
        finishButton: 'span[data-action="COMPLETE"]'
    }
    },

    TeamMemberCard:{
    generalCheckButton: '.main-buttons-item-text-box',
    commentWithTicket: 'text=Created onboarding ticket for Helpdesk.',
    }
};

// === КОНСТАНТЫ ===
const FILE_PATHS = {
    linksJson: path.join(__dirname, '../helpers/Links.json'),
};

// ЭКСПОРТ: Делаем переменную доступной для других файлов
module.exports = { 
    SELECTORS_CATALOG, 
    FILE_PATHS 
};