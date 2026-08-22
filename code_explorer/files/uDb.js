window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uDb'] = {
  code: `﻿unit uDb;

{
  Модуль работы с базой данных.
  Создает FireDAC-соединение с SQL Server, подключается к базе foura
  и выполняет миграцию: создает таблицы и триггеры архива операций
  по схеме дампа localhost_sqlserver.sql.
}

interface

uses
  System.SysUtils,
  FireDAC.Comp.Client;

type
  // Обертка над FireDAC-соединением и первичной настройкой структуры БД.
  TSchoolDb = class
  private
    FConnection: TFDConnection;
  public
    constructor Create;
    destructor Destroy; override;

    procedure Connect;
    procedure Migrate;

    property Connection: TFDConnection read FConnection;
  end;

implementation

uses
  FireDAC.Stan.Def,
  FireDAC.Stan.Async,
  FireDAC.Stan.Param,
  FireDAC.Phys,
  FireDAC.Phys.MSSQL,
  FireDAC.Phys.MSSQLDef,
  FireDAC.UI.Intf,
  FireDAC.VCLUI.Wait,
  uMigrations;

const
  SqlServerName = 'localhost';
  SqlDatabaseName = 'foura';

constructor TSchoolDb.Create;
begin
  inherited Create;
  FConnection := TFDConnection.Create(nil);
end;

destructor TSchoolDb.Destroy;
begin
  FConnection.Free;
  inherited Destroy;
end;

procedure TSchoolDb.Connect;
begin
  FConnection.LoginPrompt := False;
  FConnection.Params.Clear;
  FConnection.Params.Values['DriverID'] := 'MSSQL';
  FConnection.Params.Values['Server'] := SqlServerName;
  // Подключаемся без указания Database (к master по умолчанию),
  // чтобы создать целевую базу, если её ещё нет.
  FConnection.Params.Values['OSAuthent'] := 'Yes';
  FConnection.Connected := True;

  FConnection.ExecSQL(
    'IF DB_ID(N''' + SqlDatabaseName + ''') IS NULL ' +
    'CREATE DATABASE [' + SqlDatabaseName + ']'
  );

  // Переподключаемся к целевой базе.
  FConnection.Connected := False;
  FConnection.Params.Values['Database'] := SqlDatabaseName;
  FConnection.Connected := True;
end;

procedure TSchoolDb.Migrate;
begin
  TSchoolDbMigrator.Migrate(FConnection);
end;

end.
`,
  annotations: [
    {
      startLine: 1, endLine: 8,
      title: 'Заголовок модуля uDb',
      explanation: 'Объявляет модуль uDb. Фигурный блок {...} — это комментарий Delphi (многострочный). Модуль отвечает за подключение к SQL Server через FireDAC и запуск миграций схемы. Это инфраструктурный слой — самый нижний в приложении.'
    },
    {
      startLine: 10, endLine: 14,
      title: 'Секция interface + uses',
      explanation: 'interface открывает видимую снаружи часть модуля. uses подключает System.SysUtils (базовые утилиты вроде Trim/Format) и FireDAC.Comp.Client (компонент TFDConnection — главный объект соединения FireDAC с БД).'
    },
    {
      startLine: 16, endLine: 29,
      title: 'Класс TSchoolDb',
      explanation: 'Обёртка над FireDAC-соединением. Хранит FConnection в private, наружу отдаёт через read-only свойство Connection. Конструктор/деструктор управляют временем жизни объекта соединения. Два публичных метода: Connect (подключиться) и Migrate (создать таблицы). Это обычный класс (TObject), не форма.'
    },
    {
      startLine: 31, endLine: 42,
      title: 'implementation uses',
      explanation: 'В implementation-секции uses перечислены модули, нужные только для реализации, но не для внешнего интерфейса. Здесь — подсистемы FireDAC (Stan.Def/Async/Param — параметры и драйвера, Phys.MSSQL — физический драйвер MS SQL Server, VCLUI.Wait — визуальный ожидатель) и uMigrations (собственный модуль миграций). Вынесение сюда прячет эти зависимости от тех, кто просто использует TSchoolDb.'
    },
    {
      startLine: 44, endLine: 46,
      title: 'Константы подключения',
      explanation: 'Имя SQL-сервера и имя базы. Вынесены в константы, чтобы менять параметры в одном месте. Windows-аутентификация (OSAuthent=Yes) использует учётку текущего пользователя Windows, без отдельного SQL-логина.'
    },
    {
      startLine: 48, endLine: 52,
      title: 'Конструктор TSchoolDb.Create',
      explanation: 'Сначала вызывает inherited Create (инициализирует TObject), затем создаёт TFDConnection с владельцем nil — значит, объект соединения никто не освободит автоматически, и его нужно Free вручную в деструкторе. Это намеренно: TSchoolDb сам владеет соединением.'
    },
    {
      startLine: 54, endLine: 58,
      title: 'Деструктор TSchoolDb.Destroy',
      explanation: 'Освобождает FConnection через Free и вызывает inherited. override нужен, потому что Destroy — виртуальный метод TObject. Порядок: сначала свой объект, потом inherited — стандартный паттерн освобождения в Delphi.'
    },
    {
      startLine: 60, endLine: 80,
      title: 'Метод Connect',
      explanation: 'Настраивает и открывает соединение в два шага.\n\n1) Сначала подключается к серверу БЕЗ указания Database (по умолчанию к системной базе master) с Windows-аутентификацией. LoginPrompt=False — не показывать диалог ввода пароля.\n\n2) Выполняет IF DB_ID(...) IS NULL CREATE DATABASE — создаёт целевую базу foura, если её ещё нет. Строки SQL склеиваются через +; литерал N\'foura\' — юникодный: префикс N перед строкой в T-SQL обязателен, когда в ней есть кириллица (для латиницы он не мешает).\n\n3) Переподключается уже к базе foura (Connected:=False, задаём Database, Connected:=True).\n\nCREATE DATABASE нельзя выполнить внутри транзакции, поэтому это сделано здесь, отдельно от миграций.'
    },
    {
      startLine: 82, endLine: 85,
      title: 'Метод Migrate',
      explanation: 'Просто делегирует в TSchoolDbMigrator.Migrate, передавая соединение. Сам класс uDb не знает деталей схемы — это разделение ответственности: uDb = подключение, uMigrations = структура таблиц.'
    }
  ]
};
