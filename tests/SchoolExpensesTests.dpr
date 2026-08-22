program SchoolExpensesTests;

{
  Консольный раннер тестов проекта SchoolExpensesDemo (DUnitX).

  Сборка (из папки tests):
    dcc64 -B SchoolExpensesTests.dpr
  Запуск:
    SchoolExpensesTests.exe
  Код возврата: 0 — все тесты прошли, 1 — есть ошибки.

  Юнит-тесты (uServiceTests, uUiHelperTests) работают без БД.
  Интеграционные тесты (uRepositoryTests) используют локальный SQL Server
  и отдельную базу foura_tests; если сервер недоступен, фикстура
  не регистрируется и тесты не запускаются.
}

{$APPTYPE CONSOLE}
{$STRONGLINKTYPES ON}

uses
  System.SysUtils,
  DUnitX.TestFramework,
  DUnitX.Loggers.Console,
  FireDAC.Stan.Def,
  FireDAC.Stan.Async,
  FireDAC.Phys,
  FireDAC.Phys.MSSQL,
  uRepositories in '..\uRepositories.pas',
  uServices in '..\uServices.pas',
  uUiHelpers in '..\uUiHelpers.pas',
  uMigrations in '..\uMigrations.pas',
  uMainData in '..\uMainData.pas',
  uTestMocks in 'uTestMocks.pas',
  uServiceTests in 'uServiceTests.pas',
  uUiHelperTests in 'uUiHelperTests.pas',
  uRepositoryTests in 'uRepositoryTests.pas';

var
  Runner: ITestRunner;
  Results: IRunResults;
  Logger: ITestLogger;

begin
  ReportMemoryLeaksOnShutdown := True;
  try
    TDUnitX.Options.ExitBehavior := TDUnitXExitBehavior.Continue;

    Runner := TDUnitX.CreateRunner;
    Runner.FailsOnNoAsserts := False;
    Logger := TDUnitXConsoleLogger.Create(False);
    Runner.AddLogger(Logger);

    // Интеграционная фикстура регистрируется только при доступном сервере.
    if SqlServerAvailable then
      TDUnitX.RegisterTestFixture(TRepositoryIntegrationTests)
    else
      WriteLn('SQL Server недоступен - интеграционные тесты пропущены.');

    Results := Runner.Execute;
    if not Results.AllPassed then
      ExitCode := 1;
  except
    on E: Exception do
    begin
      WriteLn(E.ClassName, ': ', E.Message);
      ExitCode := 2;
    end;
  end;
end.
