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
     buttonBP: 'button[title="Run Workflow"]',
     colorIndicator: 'div[data-base-color]', // Для проверки стейджа сделки
    }
    },

    Helpdesk: {
        searchFilterBar: 'input[placeholder = "Filter and search"]',
        addField: '.main-ui-filter-field-add-item',
        findField: 'input[placeholder = "Find field"]',
        idLabel: 'label[title="ID"] input[type="checkbox"]',
        idLabelClick: 'label[title="ID"]', // Для клика на label
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
        licensesTabContent: 'div[data-tab-id="tab_licenses"]',
        licenseCheckbox: 'div[data-tab-id="tab_licenses"]  .ui-form-row input[type="checkbox"]',

        // Закрытие сделки
        notification: '.ui-notification-manager-browser-content',
        stageClose: 'div[data-id="C9:WON"]',
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
    stagePause: 'div[data-id="C8:WON"]', //  C8:UC_MMVAE0
    
    commentWithTicket: (text) => `text=/${text}/i`, // стрелочная функция для поиска комментария
    // commentWithTicket: (text) => `.crm-timeline__editable-text_text:has-text("${text}")`,
    //commentWithTicket: 'text=Created onboarding ticket for Helpdesk.',
    historyRecordBlock: '.ui-entity-editor-content-block-text',
    historyRecordLine: '.history-field--entity-record',
    historyRecordLabel: '.history-field--entity-record--field-label',
    historyRecordValue: '.history-field--entity-record--field-value',

    // PTO - General Info
    startDateGeneral: 'div[data-cid="UF_CRM_1631800544"] span[class="fields date field-item"]',
    ptoGeneral: '//div[contains(@class, "ui-entity-editor-block-title") and contains(., "PTO")]/following-sibling::div[contains(@class, "ui-entity-editor-content-block")]',
    
    PTO:{ 
    // PTO - Time Off Requests
    timeOffRequestsTab: '#crm_scope_detail_custom_deal_8_24_tab_relation_dynamic_188',
    newItemButton: 'a[title="New item"]',
    typeOfTimeOffField: 'div[data-name="UF_CRM_28_TYPE_OF_TIME_OFF"]',
    typeOfTimeOffSelect: 'span[id^=UF_CRM_28_TYPE_OF_TIME_OFF_value]',  // id начинается с ...
    timeOffStageClose: 'div[data-stage-id="final"]',
    timeOffApprove: '.popup-window-buttons button[class="ui-btn ui-btn-success"]',
    
    // PTO - Time Monitoring
    timeMonitoringTab: '#crm_scope_detail_custom_deal_8_24_tab_time_monitoring',
    startDateToM: 'div.col-md-2 .employee_general_info',
    balanceDate: '#date',
    allowedSince: '.allowed_since',
    ptoToM: 'div.col-md-2:nth-of-type(4) .employee_general_info',
    inCompany: 'div.col-md-2:nth-of-type(3) .employee_general_info',
    
    // PTO - Dashboard Fields (Paid Days)
    defaultDaysPaid: '.text_widget',
    previousPeriod: '.block_text_widget .text_widget:nth-of-type(2)',
    allowedPaidDays: '.allowed_paid_days .text_widget',
    availablePaid: '.dashboard-info-1 .av',
    usedPaid: '.dashboard-info-1 .us',
    
    // PTO - Dashboard Fields (Sick Days)
    defaultDaysSick: '.col-md-3 .text_widget',
    availableSick: '.dashboard-info-2 .av',
    usedSick: '.dashboard-info-2 .us',
    
    // PTO - Dashboard Fields (Unpaid Days)
    defaultDaysUnpaid: '.col-md-3:nth-of-type(3) .text_widget',
    availableUnpaid: '.dashboard-info-3 .av',
    usedUnpaid: '.dashboard-info-3 .us',
    },

    BP:{
    // Бизнесс Процесс общее
    runButton: '.ui-btn-text:has-text("RUN")',
    dropdownBP: '.ui-selector-item',
    errorBox: 'span.ui-alert-message',

    // Dismiss BP
    dismissBtn: '.ui-selector-item:has-text("[HR] Dismiss")',
    dismissalDate: 'input[name="Parameter1"]',
    accessDeactivationDate: 'input[name="Parameter10"]',
    dismissalReason: 'select[id="id_Parameter2"]',
    transferFiles: 'select[id="id_Parameter6"]', // Обязательное поле
    forwardEmails: 'select[id="id_Parameter8"]', // Обязательное поле

    //Rehire
    rehireBtn: '.ui-selector-item:has-text("[HR] Rehire")',
    gender: 'select[id="id_Gender"]',
    officeType: 'select[id="id_OfficeType"]',
    cityStateCurrent: 'input[name="CityStateofCurrentLocation"]',
    currentCountry: 'select[id="id_CountryofCurrentLocation"]',
    startDateRehire: 'input[name="Startdate"]',
    jobLevel: 'select[id="id_JobLevel"]',
    workschedule: 'select[id="id_Workschedule"]',
    position: 'select[id="id_Position"]',
    ptoFieldBPRehire: 'select[id="id_PTO"]',
    timezone: 'select[id="id_Timezone"]',
    probationperiod: 'input[name="Probationperiod"]',
    budget: 'select[id="id_Budget"]',
    paymentType: 'select[id="id_Paymenttype"]',
    typeOfContract: 'select[id="id_TypeofContract"]',
    recruitingSource: 'select[id="id_Recruiting_Source"]',
    businessEntity: 'select[name="UF_CRM_1657638652136"]',
    departments: 'select[name="UF_DEPARTMENTS"]',
    
    // Rehire BP - поля с тегами (tag selectors)
    recruiterAddButton: 'div[id="id_Recruiter"] .ui-tag-selector-add-button-caption',
    recruiterInput: 'div[id="id_Recruiter"] input[class="ui-tag-selector-item ui-tag-selector-text-box"]',
    managerAddButton: 'div[id="id_manager"] .ui-tag-selector-add-button-caption',
    managerInput: 'div[id="id_manager"] input[class="ui-tag-selector-item ui-tag-selector-text-box"]',
    teamLeadAddButton: 'div[id="id_Team_Lead"] .ui-tag-selector-add-button-caption',
    teamLeadInput: 'div[id="id_Team_Lead"] input[class="ui-tag-selector-item ui-tag-selector-text-box"]',
    mainTeamLeadAddButton: 'div[id="id_Main_Team_Lead"] .ui-tag-selector-add-button-caption',
    mainTeamLeadInput: 'div[id="id_Main_Team_Lead"] input[class="ui-tag-selector-item ui-tag-selector-text-box"]',
    hrAddButton: 'div[id="id_HR"] .ui-tag-selector-add-button-caption',
    hrInput: 'div[id="id_HR"] input[class="ui-tag-selector-item ui-tag-selector-text-box"]',
    
    // Общий селектор для tag input (если используется без специфичного id)
    tagSelectorInput: 'input[class="ui-tag-selector-item ui-tag-selector-text-box"]',
    
    // Комментарии для поиска
    rehireCommentText: 'Created rehire ticket for Helpdesk.',

    // Request Access
    requestAccessBtn: '.ui-selector-item:has-text("[HR] Request Access")',
    urgency: 'select[id="id_Urgency"]',
    region: 'select[id="id_Region"]',
    accesslevel:'select[id="id_Accesslevel"]',
    description: 'textarea[name="Description"]',

    // On Hold
    onHoldBtn: '.ui-selector-item:has-text("[HR] On Hold")',
    onHoldReason: 'select[id="id_OnHoldReason"]',
    suspendOtherAccess: 'select[name="NeedToSuspendOtherAccess"]',
    suspendAzureGoogle: 'select[name="NeedToSuspendAzureGoogle"]',
    onHoldStartDate: 'input[name="OnHoldStartDate"]',
    expectedReturn: 'input[name="ExpectedReturn"]',
    },

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