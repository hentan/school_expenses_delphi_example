unit uMigrations;

{
  Database migrations.
  Creates tables and archive triggers required by the application,
  following the schema of localhost_sqlserver.sql (database foura).
}

interface

uses
  FireDAC.Comp.Client;

type
  TSchoolDbMigrator = class
  public
    class procedure Migrate(AConnection: TFDConnection);
  end;

implementation

class procedure TSchoolDbMigrator.Migrate(AConnection: TFDConnection);
begin
  // Все таблицы и триггеры создаются атомарно: при ошибке откат,
  // чтобы схема не осталась в промежуточном состоянии.
  // CREATE DATABASE здесь нет (он в uDb.Connect), поэтому DDL можно
  // обернуть в транзакцию.
  AConnection.StartTransaction;
  try
    // parents_and_children — справочник учеников и родителей
    AConnection.ExecSQL(
      'IF OBJECT_ID(N''dbo.parents_and_children'', N''U'') IS NULL ' +
      'CREATE TABLE dbo.parents_and_children (' +
      '  id INT NOT NULL CONSTRAINT pk_parents_and_children PRIMARY KEY,' +
      '  children_name NVARCHAR(200) NOT NULL,' +
      '  parent_name NVARCHAR(200) NOT NULL,' +
      '  phone NVARCHAR(50) NOT NULL,' +
      '  after_lesson NVARCHAR(50) NOT NULL' +
      ')'
    );

    // money_from_parents — поступления денег от родителей
    AConnection.ExecSQL(
      'IF OBJECT_ID(N''dbo.money_from_parents'', N''U'') IS NULL ' +
      'CREATE TABLE dbo.money_from_parents (' +
      '  children_name NVARCHAR(200) NOT NULL,' +
      '  summ_to_first_november INT NOT NULL,' +
      '  id INT NOT NULL' +
      ')'
    );

    // money_from_parents_arc — архив поступлений (после удаления/изменения)
    AConnection.ExecSQL(
      'IF OBJECT_ID(N''dbo.money_from_parents_arc'', N''U'') IS NULL ' +
      'CREATE TABLE dbo.money_from_parents_arc (' +
      '  children_name NVARCHAR(200) NULL,' +
      '  summ_to_first_november INT NULL,' +
      '  id INT NULL,' +
      '  date_ins DATETIME NOT NULL CONSTRAINT df_money_arc_date DEFAULT GETDATE()' +
      ')'
    );

    // outlay — расходы
    AConnection.ExecSQL(
      'IF OBJECT_ID(N''dbo.outlay'', N''U'') IS NULL ' +
      'CREATE TABLE dbo.outlay (' +
      '  id INT IDENTITY(1,1) NOT NULL CONSTRAINT pk_outlay PRIMARY KEY,' +
      '  date_purchaise DATE NOT NULL,' +
      '  item_name NVARCHAR(350) NOT NULL,' +
      '  customer INT NOT NULL,' +
      '  summ DECIMAL(7,2) NULL' +
      ')'
    );

    // outlay_arc — архив расходов (после удаления)
    AConnection.ExecSQL(
      'IF OBJECT_ID(N''dbo.outlay_arc'', N''U'') IS NULL ' +
      'CREATE TABLE dbo.outlay_arc (' +
      '  id INT NOT NULL,' +
      '  date_purchaise DATE NOT NULL,' +
      '  item_name NVARCHAR(350) NOT NULL,' +
      '  customer INT NOT NULL,' +
      '  summ DECIMAL(7,2) NULL' +
      ')'
    );

    // Триггер: архивирование удалённых поступлений
    // CREATE OR ALTER — идемпотентная конструкция (SQL Server 2016 SP1+),
    // т.к. CREATE TRIGGER не может быть в одном батче с IF.
    AConnection.ExecSQL(
      'CREATE OR ALTER TRIGGER dbo.money_from_parents_delete ' +
      'ON dbo.money_from_parents ' +
      'AFTER DELETE AS ' +
      'BEGIN ' +
      '  SET NOCOUNT ON; ' +
      '  INSERT INTO dbo.money_from_parents_arc(children_name, id, summ_to_first_november) ' +
      '  SELECT children_name, id, summ_to_first_november FROM deleted; ' +
      'END'
    );

    // Триггер: архивирование старых версий поступлений при изменении
    AConnection.ExecSQL(
      'CREATE OR ALTER TRIGGER dbo.money_from_parents_update ' +
      'ON dbo.money_from_parents ' +
      'AFTER UPDATE AS ' +
      'BEGIN ' +
      '  SET NOCOUNT ON; ' +
      '  INSERT INTO dbo.money_from_parents_arc(children_name, id, summ_to_first_november) ' +
      '  SELECT children_name, id, summ_to_first_november FROM deleted; ' +
      'END'
    );

    // Триггер: архивирование удалённых расходов
    AConnection.ExecSQL(
      'CREATE OR ALTER TRIGGER dbo.delete_from_outlay ' +
      'ON dbo.outlay ' +
      'AFTER DELETE AS ' +
      'BEGIN ' +
      '  SET NOCOUNT ON; ' +
      '  INSERT INTO dbo.outlay_arc(date_purchaise, id, item_name, customer, summ) ' +
      '  SELECT date_purchaise, id, item_name, customer, summ FROM deleted; ' +
      'END'
    );

    AConnection.Commit;
  except
    AConnection.Rollback;
    raise;
  end;
end;

end.
