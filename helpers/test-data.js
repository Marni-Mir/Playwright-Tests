// Этот файл содержит наборы данных для параметризованных тестов бизнес-процессов.

const bpTestCases = [
    // Кейс 1: Проверка обязательных полей для процесса Rehire
    {
        testName: 'for [HR] Rehire', // Название для отчета
        bpName: '[HR] Rehire',       // Название БП для поиска на UI
        requiredText: `The 'Gender' field is required.
The 'Office Type' field is required.
The 'City/State of Current Location' field is required.
The 'Country of Current Location' field is required.
The 'Start date' field is required.
The 'Job Level' field is required.
The 'Work schedule' field is required.
The 'PTO' field is required.
The 'Time zone' field is required.
The 'Probation period (months)' field is required.
The 'Budget' field is required.
The 'Payment type' field is required.
The 'Type of Contract' field is required.
The 'Recruiter' field is required.
The 'Manager' field is required.
The 'HR' field is required.
1111The 'Recruiting Source' field is required.
The 'Department Block' field is required.`.trim()
     },


    // Кейс 2: Проверка для другого процесса
    {
        testName: 'for [HR] Dismiss',
        bpName: '[HR] Dismiss',
        requiredText: `The 'Dismissal Date and Time' field is required.
The 'Reason for dismissal' field is required.
The 'Should we transfer the files?' field is required.
The 'Forward future emails to another team member?' field is required.`.trim()
    },

/*    // Кейс 3: Проверка для следующего процесса
    {
        testName: 'for [HR] Change Team Member Information',
        bpName: '[HR] Change Team Member Information',
        requiredText: `The 'Requester' field is required.
The 'Urgency' field is required.`.trim()
    },
*/
    // Сюда можно добавлять сколько угодно кейсов...
];

// Экспортируем массив
module.exports = {bpTestCases};
