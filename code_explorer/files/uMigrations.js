window.LEARN_FILES = window.LEARN_FILES || {};
window.LEARN_FILES['uMigrations'] = {
  code: `﻿unit uMigrations;

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
`,
  annotations: [
    {
      startLine: 1, endLine: 7,
      title: 'Заголовок модуля uMigrations',
      explanation: 'Модуль миграций БД. Создаёт таблицы и триггеры архива при старте приложения. Запускается из uDb.Migrate. Здесь нет подключения — только DDL (операторы создания структуры) поверх уже открытого соединения.'
    },
    {
      startLine: 9, endLine: 18,
      title: 'interface: TSchoolDbMigrator',
      explanation: 'Класс с одним методом. Это class procedure (метод класса, а не экземпляра) — вызывается как TSchoolDbMigrator.Migrate(Conn), без создания объекта. Удобно для процедурного кода, сгруппированного в класс. Принимает TFDConnection — соединение, на котором выполняет DDL.'
    },
    {
      startLine: 22, endLine: 28,
      title: 'Начало Migrate: транзакция',
      explanation: 'StartTransaction открывает транзакцию. try/except/finally-паттерн: если любой DDL упадёт, откат (Rollback) вернёт базу в исходное состояние, raise пробросит ошибку дальше. Почему транзакция работает: CREATE TABLE можно выполнить в транзакции, а вот CREATE DATABASE — нельзя (поэтому он в uDb.Connect, отдельно). Это гарантирует атомарность: схема либо создаётся целиком, либо не создаётся вовсе.'
    },
    {
      startLine: 30, endLine: 40,
      title: 'Таблица parents_and_children',
      explanation: 'Справочник учеников. IF OBJECT_ID(...) IS NULL — проверка существования таблицы, создаёт только если её нет (идемпотентность — безопасно запускать повторно). Поля: id (PK, INT), children_name (ФИО ученика), parent_name (родитель), phone, after_lesson. NVARCHAR — юникод, обязателен для кириллицы. Текст SQL склеивается плюсом; в T-SQL удвоение апострофа \'\' даёт литеральный апостроф.'
    },
    {
      startLine: 42, endLine: 50,
      title: 'Таблица money_from_parents',
      explanation: 'Поступления денег от родителей. Обратите внимание на схему: id здесь — это id ученика (внешний ключ на parents_and_children), а не отдельный первичный ключ платежа. summ_to_first_november — сумма (странное имя «сумма к 1 ноября» — наследие исходного дампа). Это «плоская» денормализованная схема, сознательно используемая в проекте вместо нормализованной.'
    },
    {
      startLine: 52, endLine: 61,
      title: 'Таблица money_from_parents_arc',
      explanation: 'Архив поступлений. Поля могут быть NULL (для совместимости со старыми данными). date_ins — дата архивации, по умолчанию GETDATE() (текущее время сервера) через DEFAULT-констрейнт. Заполняется триггерами при удалении/изменении платежа — своего рода аудит.'
    },
    {
      startLine: 63, endLine: 73,
      title: 'Таблица outlay (расходы)',
      explanation: 'Расходы класса. id — IDENTITY(1,1), автоинкрементный первичный ключ (в отличие от parents_and_children, где id задаётся вручную). date_purchaise (дата покупки, DATE), item_name (на что потрачено), customer (кто платил — id ученика), summ DECIMAL(7,2) — сумма с 2 знаками после запятой, копейки не теряются. NULL для суммы допустим по схеме: SUM такие строки просто пропускает.'
    },
    {
      startLine: 75, endLine: 85,
      title: 'Таблица outlay_arc',
      explanation: 'Архив удалённых расходов. Структура повторяет outlay, но без IDENTITY — id копируется из удалённой записи. Заполняется триггером delete_from_outlay.'
    },
    {
      startLine: 87, endLine: 99,
      title: 'Триггер money_from_parents_delete',
      explanation: 'AFTER DELETE — срабатывает после удаления строки из money_from_parents. Копирует удалённую строку в архивную таблицу. inserted/deleted — псевдотаблицы SQL Server, доступные в триггерах: deleted содержит старые (удалённые) значения. SET NOCOUNT ON подавляет сообщение о числе строк (лишний шум в FireDAC). CREATE OR ALTER — идемпотентная конструкция SQL Server 2016 SP1+: можно запускать повторно без IF OBJECT_ID (обычный CREATE TRIGGER так нельзя в одном батче с IF).'
    },
    {
      startLine: 101, endLine: 111,
      title: 'Триггер money_from_parents_update',
      explanation: 'AFTER UPDATE — при изменении платежа копирует СТАРУЮ версию (из deleted) в архив. Так сохраняется история изменений: можно посмотреть, какой платёж был до правки.'
    },
    {
      startLine: 113, endLine: 123,
      title: 'Триггер delete_from_outlay',
      explanation: 'AFTER DELETE для расходов: копирует удалённую строку в outlay_arc. Обратите внимание: архивируются только удаления — триггера AFTER UPDATE для outlay нет, поэтому отредактированный расход не оставляет в архиве никакого следа. Это известное ограничение проекта (см. architecture.md, «Известные ограничения», п.6).'
    },
    {
      startLine: 125, endLine: 129,
      title: 'Завершение Migrate: Commit/Rollback',
      explanation: 'Если все ExecSQL прошли без ошибок — Commit фиксирует схему. В except — Rollback откатывает и raise пробрасывает исключение вызывающему коду (в .dpr оно приведёт к аварийному завершению с сообщением). Так миграция либо применяется полностью, либо не применяется вообще.'
    }
  ]
};
