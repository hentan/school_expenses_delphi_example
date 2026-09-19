unit uDb;

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
  // Локальный экземпляр SQL Server по умолчанию (служба MSSQLSERVER).
  SqlServerName = 'localhost';
  SqlDatabaseName = 'foura';
  SqlLoginTimeout = '15';

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
  FConnection.Params.Values['LoginTimeout'] := SqlLoginTimeout;
  FConnection.Params.Values['ApplicationName'] := 'SchoolExpensesDemo';
  // Для локального SQL Server сертификат обычно самоподписанный.
  // ODBC Driver 18 по умолчанию требует доверенный сертификат.
  FConnection.Params.Values['Encrypt'] := 'No';
  FConnection.Params.Values['TrustServerCertificate'] := 'Yes';
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
