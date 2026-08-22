unit uUiHelperTests;

{
  Тесты вспомогательных функций uUiHelpers.
  ShowException/ConfirmDelete не тестируются — это интерактивные
  диалоги, требующие участия пользователя.
}

interface

uses
  System.SysUtils,
  Data.DB,
  Vcl.Forms,
  Vcl.StdCtrls,
  FireDAC.Comp.Client,
  DUnitX.TestFramework,
  uUiHelpers;

type
  [TestFixture]
  TParseSumTests = class(TObject)
  public
    [Test]
    procedure ParseSum_Integer_ReturnsTrue;
    [Test]
    procedure ParseSum_TrimsSpaces;
    [Test]
    procedure ParseSum_Decimal_RoundtripThroughCurrToStr;
    [Test]
    procedure ParseSum_Zero_ReturnsFalse;
    [Test]
    procedure ParseSum_Negative_ReturnsFalse;
    [Test]
    procedure ParseSum_Garbage_ReturnsFalse;
  end;

  [TestFixture]
  TTodayIsoTests = class(TObject)
  public
    [Test]
    procedure TodayIso_MatchesFormatDateTime;
    [Test]
    procedure TodayIso_HasIsoLengthAndSeparators;
  end;

  [TestFixture]
  TComboHelpersTests = class(TObject)
  private
    FHost: TForm;
    FCombo: TComboBox;
  public
    [Setup]
    procedure Setup;
    [Teardown]
    procedure Teardown;

    [Test]
    procedure AddPupilComboItem_StoresIdInObject;
    [Test]
    procedure GetComboPupilId_NoSelection_ReturnsZero;
    [Test]
    procedure GetComboPupilId_Selected_ReturnsItsId;
    [Test]
    procedure SelectComboPupilId_SelectsMatchingItem;
    [Test]
    procedure SelectComboPupilId_NotFound_FallsBackToFirstItem;
    [Test]
    procedure SelectComboPupilId_EmptyCombo_KeepsNoSelection;
    [Test]
    procedure ClearComboObjects_RemovesItemsAndObjects;
    [Test]
    procedure Helpers_NilArguments_DoNotCrash;
  end;

  [TestFixture]
  TSetFieldLayoutTests = class(TObject)
  public
    [Test]
    procedure SetFieldLayout_AppliesLabelAndWidth;
    [Test]
    procedure SetFieldLayout_UnknownField_IsIgnored;
  end;

implementation

{ TParseSumTests }

procedure TParseSumTests.ParseSum_Integer_ReturnsTrue;
var
  Value: Currency;
begin
  Assert.IsTrue(ParseSum('1500', Value));
  Assert.IsTrue(Value = 1500);
end;

procedure TParseSumTests.ParseSum_TrimsSpaces;
var
  Value: Currency;
begin
  Assert.IsTrue(ParseSum('  250 ', Value));
  Assert.IsTrue(Value = 250);
end;

procedure TParseSumTests.ParseSum_Decimal_RoundtripThroughCurrToStr;
var
  Text: string;
  Value: Currency;
begin
  // CurrToStr/TryStrToCurr используют одни и те же настройки локали,
  // поэтому круговая проверка не зависит от языка системы.
  Text := CurrToStr(123.45);
  Assert.IsTrue(ParseSum(Text, Value), 'ParseSum должен распознать ' + Text);
  Assert.IsTrue(Value = 123.45, 'Копейки не должны теряться');
end;

procedure TParseSumTests.ParseSum_Zero_ReturnsFalse;
var
  Value: Currency;
begin
  Assert.IsFalse(ParseSum('0', Value));
end;

procedure TParseSumTests.ParseSum_Negative_ReturnsFalse;
var
  Value: Currency;
begin
  Assert.IsFalse(ParseSum('-100', Value));
end;

procedure TParseSumTests.ParseSum_Garbage_ReturnsFalse;
var
  Value: Currency;
begin
  Assert.IsFalse(ParseSum('abc', Value));
  Assert.IsFalse(ParseSum('', Value));
end;

{ TTodayIsoTests }

procedure TTodayIsoTests.TodayIso_MatchesFormatDateTime;
begin
  Assert.AreEqual(FormatDateTime('yyyy-mm-dd', Date), TodayIso);
end;

procedure TTodayIsoTests.TodayIso_HasIsoLengthAndSeparators;
begin
  Assert.AreEqual<Integer>(10, Length(TodayIso));
  Assert.AreEqual('-', Copy(TodayIso, 5, 1), 'Разделитель год-месяц');
  Assert.AreEqual('-', Copy(TodayIso, 8, 1), 'Разделитель месяц-день');
end;

{ TComboHelpersTests }

procedure TComboHelpersTests.Setup;
begin
  // TComboBox работает с Items через window handle, поэтому ему нужно
  // родительское окно — даём форму-хост.
  FHost := TForm.Create(nil);
  FCombo := TComboBox.Create(FHost);
  FCombo.Parent := FHost;
end;

procedure TComboHelpersTests.Teardown;
begin
  ClearComboObjects(FCombo);
  FHost.Free;
end;

procedure TComboHelpersTests.AddPupilComboItem_StoresIdInObject;
begin
  AddPupilComboItem(FCombo, 'Иванов А.', 11);

  FCombo.ItemIndex := 0;
  Assert.AreEqual(1, FCombo.Items.Count);
  Assert.AreEqual(11, GetComboPupilId(FCombo));
end;

procedure TComboHelpersTests.GetComboPupilId_NoSelection_ReturnsZero;
begin
  AddPupilComboItem(FCombo, 'Иванов А.', 11);
  AddPupilComboItem(FCombo, 'Петрова В.', 22);

  Assert.AreEqual(-1, FCombo.ItemIndex);
  Assert.AreEqual(0, GetComboPupilId(FCombo));
end;

procedure TComboHelpersTests.GetComboPupilId_Selected_ReturnsItsId;
begin
  AddPupilComboItem(FCombo, 'Иванов А.', 11);
  AddPupilComboItem(FCombo, 'Петрова В.', 22);
  FCombo.ItemIndex := 1;

  Assert.AreEqual(22, GetComboPupilId(FCombo));
end;

procedure TComboHelpersTests.SelectComboPupilId_SelectsMatchingItem;
begin
  AddPupilComboItem(FCombo, 'Иванов А.', 11);
  AddPupilComboItem(FCombo, 'Петрова В.', 22);

  SelectComboPupilId(FCombo, 22);

  Assert.AreEqual(1, FCombo.ItemIndex);
  Assert.AreEqual(22, GetComboPupilId(FCombo));
end;

procedure TComboHelpersTests.SelectComboPupilId_NotFound_FallsBackToFirstItem;
begin
  AddPupilComboItem(FCombo, 'Иванов А.', 11);
  AddPupilComboItem(FCombo, 'Петрова В.', 22);

  SelectComboPupilId(FCombo, 99);

  Assert.AreEqual(0, FCombo.ItemIndex, 'Должен выбираться первый элемент');
  Assert.AreEqual(11, GetComboPupilId(FCombo));
end;

procedure TComboHelpersTests.SelectComboPupilId_EmptyCombo_KeepsNoSelection;
begin
  SelectComboPupilId(FCombo, 5);

  Assert.AreEqual(-1, FCombo.ItemIndex);
end;

procedure TComboHelpersTests.ClearComboObjects_RemovesItemsAndObjects;
begin
  AddPupilComboItem(FCombo, 'Иванов А.', 11);
  AddPupilComboItem(FCombo, 'Петрова В.', 22);

  ClearComboObjects(FCombo);

  Assert.AreEqual(0, FCombo.Items.Count);
  // Повторный вызов на пустом списке безопасен.
  ClearComboObjects(FCombo);
  Assert.AreEqual(0, FCombo.Items.Count);
end;

procedure TComboHelpersTests.Helpers_NilArguments_DoNotCrash;
begin
  ClearComboObjects(nil);
  Assert.AreEqual(0, GetComboPupilId(nil));
  SelectComboPupilId(nil, 7);
  Assert.Pass;
end;

{ TSetFieldLayoutTests }

procedure TSetFieldLayoutTests.SetFieldLayout_AppliesLabelAndWidth;
var
  Table: TFDMemTable;
begin
  Table := TFDMemTable.Create(nil);
  try
    Table.FieldDefs.Add('summ', ftCurrency);
    Table.CreateDataSet;

    SetFieldLayout(Table, 'summ', 'Сумма', 12);

    Assert.AreEqual('Сумма', Table.FieldByName('summ').DisplayLabel);
    Assert.AreEqual(12, Table.FieldByName('summ').DisplayWidth);
  finally
    Table.Free;
  end;
end;

procedure TSetFieldLayoutTests.SetFieldLayout_UnknownField_IsIgnored;
var
  Table: TFDMemTable;
begin
  Table := TFDMemTable.Create(nil);
  try
    Table.FieldDefs.Add('summ', ftCurrency);
    Table.CreateDataSet;

    SetFieldLayout(Table, 'missing_field', 'Заголовок', 5);

    Assert.AreEqual('summ', Table.Fields[0].FieldName);
  finally
    Table.Free;
  end;
end;

initialization
  TDUnitX.RegisterTestFixture(TParseSumTests);
  TDUnitX.RegisterTestFixture(TTodayIsoTests);
  TDUnitX.RegisterTestFixture(TComboHelpersTests);
  TDUnitX.RegisterTestFixture(TSetFieldLayoutTests);

end.
