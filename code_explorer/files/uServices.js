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

const
  // Назначение итоговой строки сальдо, остающейся в outlay после архивации.
  CarryOverItemName = 'Сальдо на конец периода';

type
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
    procedure Add(APupilId: Integer; const AChildrenName: string; ASum: Integer);
    procedure Delete(AId: Integer);
    procedure Update(AId: Integer; const AChildrenName: string; ASum: Integer);
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

  // Сервис архивации: закрывает период — текущие платежи и расходы
  // переносятся в архивные таблицы, в outlay остаётся строка сальдо.
  TArchiveService = class
  private
    FRepository: IArchiveRepository;
  public
    constructor Create(ARepository: IArchiveRepository);
    function Preview: TClosePeriodResult;
    function ClosePeriod: TClosePeriodResult;
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
  ASum: Integer);
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
  ASum: Integer);
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

{ TArchiveService }

constructor TArchiveService.Create(ARepository: IArchiveRepository);
begin
  inherited Create;
  FRepository := ARepository;
end;

function TArchiveService.Preview: TClosePeriodResult;
begin
  Result := FRepository.Preview;
end;

function TArchiveService.ClosePeriod: TClosePeriodResult;
begin
  Result := FRepository.ClosePeriod(CarryOverItemName);
  // Если обнулять и архивировать было нечего, репозиторий ничего не менял.
  if (Result.ResetPayments = 0) and (Result.ArchivedExpenses = 0) then
    raise EValidationException.Create('Нет данных для архивации');
end;

end.
`,
  annotations: [
    {
      startLine: 3, endLine: 8,
      title: 'Заголовок модуля uServices',
      explanation: 'Бизнес-слой приложения. Сервисы стоят между формами (UI) и репозиториями (данные). Главная задача: проверить входные данные и выбросить EValidationException с понятным пользователю сообщением прежде, чем что-то попадёт в базу. Формы НЕ обращаются к репозиториям напрямую — только через сервисы. Это центральное архитектурное правило проекта.'
    },
    {
      startLine: 12, endLine: 14,
      title: 'interface + uses',
      explanation: 'System.SysUtils даёт Exception и Trim, uRepositories — контракты IPupilRepository/IPaymentRepository/IExpenseRepository/IArchiveRepository и типы вроде TClosePeriodArray. Зависимость от интерфейсов (не классов) — слабая связность: сервису всё равно, какая реализация скрывается за контрактом.'
    },
    {
      startLine: 16, endLine: 19,
      title: 'EValidationException',
      explanation: 'Свой класс исключений, наследник Exception. Зачем отдельный тип: формы в except проверяют `E is EValidationException` и показывают текст как есть — это сообщение для пользователя («Выберите ученика»). Любое другое исключение (сбой сети, ошибка SQL) ShowException покажет с пометкой «Ошибка:» — сразу видно, что это не опечатка пользователя, а системная проблема. См. uUiHelpers.ShowException.'
    },
    {
      startLine: 21, endLine: 23,
      title: 'Константа CarryOverItemName',
      explanation: 'const объявляет именованную константу — значение, которое нельзя изменить во время работы программы. Здесь это подпись итоговой строки сальдо, которая останется в расходах после закрытия периода. Константа вынесена сюда, чтобы сервис сам решал, как назвать строку, а репозиторий оставался «глухим» исполнителем: он получает название параметром.'
    },
    {
      startLine: 25, endLine: 37,
      title: 'TPupilService — декларация',
      explanation: 'Хранит FRepository: IPupilRepository — интерфейс, а не класс. Конструктор принимает готовый репозиторий — это dependency injection (внедрение зависимости): кто и какой репозиторий создать, решает .dpr, сервис просто пользуется тем, что дали. Методы повторяют контракт репозитория, но добавляют проверки.'
    },
    {
      startLine: 39, endLine: 49,
      title: 'TPaymentService',
      explanation: 'Та же схема: контракт внутри, валидация в методах. Total пробрасывается в репозиторий без изменений — сумму считает SQL, сервису там делать нечего.'
    },
    {
      startLine: 51, endLine: 61,
      title: 'TExpenseService',
      explanation: 'Самый строгий сервис: у расхода четыре обязательных поля (ученик, дата, назначение, сумма). У Update ещё и два id: AId — какой расход менять, APupilId — кто покупал. Оба проверяются.'
    },
    {
      startLine: 63, endLine: 71,
      title: 'TBalanceService',
      explanation: 'Особый случай: хранит ДВА контракта (платежи и расходы), потому что баланс — про обе таблицы сразу. Никакой валидации — чистый расчёт. Используется главной формой для строки статуса внизу окна.'
    },
    {
      startLine: 73, endLine: 82,
      title: 'TArchiveService — новый сервис закрытия периода',
      explanation: 'Пятый сервис, появился вместе с кнопкой «Закрыть период» на вкладке архива. Методов всего два: Preview (посчитать, что произойдёт) и ClosePeriod (сделать). Обратите внимание: ClosePeriod не принимает параметров — имя строки сальдо сервис берёт из своей константы CarryOverItemName. Так решение о подписи живёт в бизнес-слое, где ему и место.'
    },
    {
      startLine: 86, endLine: 92,
      title: 'Конструктор сервиса',
      explanation: 'inherited Create инициализирует унаследованную часть (TObject), затем сохраняем репозиторий в поле. Благодаря заглушкам _AddRef/_Release на стороне репозитория эта интерфейсная ссылка НЕ управляет временем жизни объекта — она просто указывает на него. Освобождает всё .dpr вручную.'
    },
    {
      startLine: 94, endLine: 100,
      title: 'TPupilService.Add — валидация ФИО',
      explanation: 'Trim(AChildrenName) = \'\': Trim срезает пробелы по краям, поэтому строка из одних пробелов тоже считается пустой. Плохие данные — исключение EValidationException с человеческим текстом; хорошие — вызов репозитория. В репозиторий попадают только корректные данные, поэтому он не дублирует проверки.'
    },
    {
      startLine: 102, endLine: 107,
      title: 'TPupilService.Delete — проверка id',
      explanation: 'AId <= 0 означает «в гриде ничего не выбрано» — так UI кодирует отсутствие выбора. Вместо тихого DELETE с бессмысленным условием сервис бросает «Выберите ученика». Это защита от логических ошибок в интерфейсе.'
    },
    {
      startLine: 109, endLine: 117,
      title: 'TPupilService.Update',
      explanation: 'Две проверки подряд: сначала выбран ли ученик, потом заполнено ли ФИО. Каждая ошибка — отдельный raise со своим сообщением: пользователь видит конкретную причину, а не общий отказ.'
    },
    {
      startLine: 119, endLine: 122,
      title: 'ListForCombo — чистый транзит',
      explanation: 'Чтение валидировать нечего — метод просто передаёт вызов репозиторию. Формы используют его для выпадающих списков учеников.'
    },
    {
      startLine: 124, endLine: 162,
      title: 'TPaymentService целиком',
      explanation: 'Тот же паттерн «проверь и передай», но с денежной проверкой: ASum <= 0 запрещено (платёж на ноль или отрицательный смысла не имеет). ASum — Integer, потому что в схеме платежи хранятся в целых рублях (money_from_parents.summ_to_first_november INT). Даты и назначения у платежей нет — в таблице money_from_parents таких колонок просто нет.'
    },
    {
      startLine: 164, endLine: 212,
      title: 'TExpenseService — самая длинная цепочка проверок',
      explanation: 'Add: 4 проверки (ученик, дата, назначение, сумма). Update: 5 — плюс id самого расхода. Сообщения называются конкретно («Дата обязательна...», а не «Ошибка ввода»), чтобы пользователь сразу понял, какое поле исправить. Только после всех ворот данные уходят в репозиторий.'
    },
    {
      startLine: 214, endLine: 227,
      title: 'TBalanceService',
      explanation: 'Balance — одна формула: Total(платежи) − Total(расходы). Каждый Total — отдельный запрос к базе, кэширования нет: при каждом обновлении статуса база опрашивается заново. Для школьной кассы это нормально.'
    },
    {
      startLine: 229, endLine: 235,
      title: 'TArchiveService.Create',
      explanation: 'Знакомый конструктор: принял контракт — сохранил в поле. Всё остальное сделает composition root в .dpr.'
    },
    {
      startLine: 237, endLine: 240,
      title: 'Preview — прозрачный проброс',
      explanation: 'Сервису тут нечего добавить: снимок «что будет при закрытии периода» считает репозиторий, а форма использует цифры для диалога подтверждения. Валидировать нечего — это чтение.'
    },
    {
      startLine: 242, endLine: 248,
      title: 'ClosePeriod — бизнес-правило поверх операции',
      explanation: 'Вот зачем нужен сервис даже при «тонкой» операции. Репозиторий честно выполнит команду и вернёт нули, если архивировать было нечего, — для него это нормальный результат. Но для пользователя «нажал кнопку — ничего не произошло» выглядит как поломка. Поэтому сервис добавляет правило: нулевой результат = EValidationException «Нет данных для архивации». Именно это поведение проверяет юнит-тест ClosePeriod_NothingToArchive_RaisesValidation из tests/uServiceTests.pas.'
    }
  ]
};
