window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uServices'] = {
  code: `﻿unit uServices;

{
  Сервисный слой: бизнес-логика и валидация.
  Сервисы обёртывают репозитории и гарантируют корректность входных
  данных перед записью в БД. Формы и точка входа работают только с
  сервисами, а не с репозиториями напрямую.
}

interface

uses
  System.SysUtils,
  uRepositories;

type
  // Ошибка валидации бизнес-правил. Сообщение пригодно для показа
  // пользователю в UI (формы ловят его и показывают через ShowMessage).
  EValidationException = class(Exception);

  // Сервис учеников: валидация + делегирование IPupilRepository.
  TPupilService = class
  private
    FRepository: IPupilRepository;
  public
    constructor Create(ARepository: IPupilRepository);
    procedure Add(const AChildrenName, AParentName, APhone, AAfterLesson: string);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName, AParentName,
                      APhone, AAfterLesson: string);
    function ListForCombo: TPupilComboArray;
  end;

  // Сервис поступлений: валидация суммы/ученика + делегирование IPaymentRepository.
  TPaymentService = class
  private
    FRepository: IPaymentRepository;
  public
    constructor Create(ARepository: IPaymentRepository);
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Currency);
    function Total: Currency;
  end;

  // Сервис расходов: валидация даты/назначения/суммы/ученика + делегирование IExpenseRepository.
  TExpenseService = class
  private
    FRepository: IExpenseRepository;
  public
    constructor Create(ARepository: IExpenseRepository);
    procedure Add(APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    procedure Delete(AId: Integer);
    procedure Update(AId, APupilId: Integer; const ADate, AItemName: string; ASum: Currency);
    function Total: Currency;
  end;

  // Считает баланс как разность поступлений и расходов.
  TBalanceService = class
  private
    FPayments: IPaymentRepository;
    FExpenses: IExpenseRepository;
  public
    constructor Create(APayments: IPaymentRepository; AExpenses: IExpenseRepository);
    function Balance: Currency;
  end;

implementation

{ TPupilService }

constructor TPupilService.Create(ARepository: IPupilRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

procedure TPupilService.Add(const AChildrenName, AParentName, APhone,
  AAfterLesson: string);
begin
  if Trim(AChildrenName) = '' then
    raise EValidationException.Create('ФИО ученика обязательно');
  FRepository.Add(AChildrenName, AParentName, APhone, AAfterLesson);
end;

procedure TPupilService.Delete(AId: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  FRepository.Delete(AId);
end;

procedure TPupilService.Update(AId: Integer; const AChildrenName, AParentName,
  APhone, AAfterLesson: string);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if Trim(AChildrenName) = '' then
    raise EValidationException.Create('ФИО ученика обязательно');
  FRepository.Update(AId, AChildrenName, AParentName, APhone, AAfterLesson);
end;

function TPupilService.ListForCombo: TPupilComboArray;
begin
  Result := FRepository.ListForCombo;
end;

{ TPaymentService }

constructor TPaymentService.Create(ARepository: IPaymentRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

procedure TPaymentService.Add(APupilId: Integer; const AChildrenName: string;
  ASum: Currency);
begin
  if APupilId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Add(APupilId, AChildrenName, ASum);
end;

procedure TPaymentService.Delete(AId: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите платёж');
  FRepository.Delete(AId);
end;

procedure TPaymentService.Update(AId: Integer; const AChildrenName: string;
  ASum: Currency);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите платёж');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Update(AId, AChildrenName, ASum);
end;

function TPaymentService.Total: Currency;
begin
  Result := FRepository.Total;
end;

{ TExpenseService }

constructor TExpenseService.Create(ARepository: IExpenseRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

procedure TExpenseService.Add(APupilId: Integer; const ADate, AItemName: string;
  ASum: Currency);
begin
  if APupilId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if Trim(ADate) = '' then
    raise EValidationException.Create('Дата обязательна для заполнения');
  if Trim(AItemName) = '' then
    raise EValidationException.Create('Назначение обязательно для заполнения');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Add(APupilId, ADate, AItemName, ASum);
end;

procedure TExpenseService.Delete(AId: Integer);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите расход');
  FRepository.Delete(AId);
end;

procedure TExpenseService.Update(AId, APupilId: Integer; const ADate,
  AItemName: string; ASum: Currency);
begin
  if AId <= 0 then
    raise EValidationException.Create('Выберите расход');
  if APupilId <= 0 then
    raise EValidationException.Create('Выберите ученика');
  if Trim(ADate) = '' then
    raise EValidationException.Create('Дата обязательна для заполнения');
  if Trim(AItemName) = '' then
    raise EValidationException.Create('Назначение обязательно для заполнения');
  if ASum <= 0 then
    raise EValidationException.Create('Сумма должна быть больше нуля');
  FRepository.Update(AId, APupilId, ADate, AItemName, ASum);
end;

function TExpenseService.Total: Currency;
begin
  Result := FRepository.Total;
end;

{ TBalanceService }

constructor TBalanceService.Create(APayments: IPaymentRepository;
  AExpenses: IExpenseRepository);
begin
  inherited Create;
  FPayments := APayments;
  FExpenses := AExpenses;
end;

function TBalanceService.Balance: Currency;
begin
  Result := FPayments.Total - FExpenses.Total;
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 8,
      title: 'Заголовок модуля uServices',
      explanation: 'Бизнес-слой приложения. Сервисы стоят между формами (UI) и репозиториями (данные). Главная задача: валидировать входные данные и выбрасывать EValidationException с понятным пользователю сообщением, прежде чем данные попадут в БД. Формы НЕ обращаются к репозиториям напрямую — только через сервисы. Это центральное архитектурное правило проекта.'
    },
    {
      startLine: 10, endLine: 14,
      title: 'interface + uses',
      explanation: 'System.SysUtils (Exception, Trim) и uRepositories — сервисам нужны интерфейсы IPupilRepository/IPaymentRepository/IExpenseRepository и тип TPupilComboArray. Зависимость от интерфейсов (а не классов) — слабая связность: сервису неважно, какая конкретная реализация репозитория под интерфейсом.'
    },
    {
      startLine: 16, endLine: 19,
      title: 'EValidationException',
      explanation: 'Свой класс исключений, наследник Exception. Зачем отдельный класс: формы в except-блоках проверяют тип через `E is EValidationException` и показывают сообщение как есть (это текст для пользователя). Прочие исключения (ошибка БД, например) показываются с префиксом «Ошибка:» — так пользователь понимает, что это не его опечатка, а системный сбой. См. uUiHelpers.ShowException.'
    },
    {
      startLine: 21, endLine: 32,
      title: 'TPupilService — декларация',
      explanation: 'Хранит FRepository: IPupilRepository (интерфейс, не класс). Конструктор принимает интерфейс — это dependency injection: кому создавать репозиторий решает .dpr (composition root), сервис просто получает готовый. Методы зеркалируют репозиторий, но добавляют валидацию. ListForCombo — проброс в репозиторий без валидации (чтение валидировать нечего).'
    },
    {
      startLine: 34, endLine: 44,
      title: 'TPaymentService',
      explanation: 'Та же схема: IPaymentRepository внутри, валидация в методах. Total пробрасывается в репозиторий — сервис не считает сумму сам, он доверяет SQL-агрегации репозитория.'
    },
    {
      startLine: 46, endLine: 56,
      title: 'TExpenseService',
      explanation: 'Самый «толстый» сервис по числу проверок — расход имеет 4 обязательных поля (ученик, дата, назначение, сумма). Update принимает два id (AId расхода + APupilId покупателя) — оба валидируются.'
    },
    {
      startLine: 58, endLine: 66,
      title: 'TBalanceService',
      explanation: 'Не обёртка над одним репозиторием, а отдельная бизнес-сущность. Хранит ДВА интерфейса (платежи + расходы). Balance = поступления − расходы. Не делает валидации — это чистый расчёт. Используется главной формой для строки статуса.'
    },
    {
      startLine: 72, endLine: 76,
      title: 'TPupilService.Create',
      explanation: 'inherited Create (инициализирует TObject), затем сохраняет репозиторий в FRepository. Интерфейсная ссылка: поскольку репозиторий использует stub-_AddRef (без подсчёта), сервис не завладеет объектом — он просто держит указатель. Время жизни обоих управляется в .dpr.'
    },
    {
      startLine: 78, endLine: 84,
      title: 'TPupilService.Add — валидация ФИО',
      explanation: 'Trim(AChildrenName) = \'\' — проверка, что ФИО не пустое (Trim убирает пробелы по краям, иначе «   » прошло бы). Если пусто — raise EValidationException с понятным сообщением. Если проверка прошла — вызов FRepository.Add. Так в репозиторий гарантированно попадают корректные данные, и он не дублирует проверки.'
    },
    {
      startLine: 86, endLine: 91,
      title: 'TPupilService.Delete — проверка id',
      explanation: 'AId <= 0 означает «никто не выбран» (в UI id = 0 как признак отсутствия выбора). Вместо молаливого удаления несуществующей строки сервис выбрасывает понятное «Выберите ученика». Это защищает от логических ошибок в UI.'
    },
    {
      startLine: 93, endLine: 101,
      title: 'TPupilService.Update — двойная валидация',
      explanation: 'Проверяет и id (выбран ли ученик) и ФИО (не пустое). Порядок важен: сначала id, потом содержимое. Каждая проверка — отдельный raise, чтобы сообщение было точным (пользователь видит, ЧТО именно не так).'
    },
    {
      startLine: 103, endLine: 106,
      title: 'TPupilService.ListForCombo',
      explanation: 'Чистый проброс в репозиторий. Чтение не требует валидации — сервис здесь просто транзит. Формы вызывают этот метод для заполнения выпадающих списков учеников.'
    },
    {
      startLine: 110, endLine: 146,
      title: 'TPaymentService: валидация сумм',
      explanation: 'Паттерн тот же, но добавляется проверка ASum <= 0 → «Сумма должна быть больше нуля». Currency — денежный тип, поддерживает копейки. Total пробрасывается в репозиторий. Заметьте: для платежа НЕ проверяется дата/назначение — в схеме money_from_parents этих полей нет (только имя, сумма, id).'
    },
    {
      startLine: 150, endLine: 196,
      title: 'TExpenseService: полная валидация',
      explanation: 'Расход требует максимум проверок: ученик (id > 0), дата (не пусто), назначение (не пусто), сумма (> 0). В Add — 4 проверки, в Update — 5 (плюс AId расхода). Каждое сообщение конкретное, чтобы пользователь понял, какое поле заполнить. После всех проверок — делегирование в репозиторий.'
    },
    {
      startLine: 200, endLine: 206,
      title: 'TBalanceService.Create',
      explanation: 'Принимает два интерфейса репозиториев. Зависит от платежей и расходов одновременно — это нужно только для расчёта баланса. В .dpr ему передают ТЕ ЖЕ репозитории, что и соответствующим сервисам (один объект — два интерфейса).'
    },
    {
      startLine: 208, endLine: 211,
      title: 'TBalanceService.Balance',
      explanation: 'Одна строка: Total(платежи) − Total(расходы). Каждый Total выполняет отдельный SQL-запрос COUNT/SUM в БД. Баланс НЕ кэшируется — каждый вызов заново опрашивает базу. Для школьного класса это нормально; для нагруженной системы стоило бы кэшировать.'
    }
  ]
};
