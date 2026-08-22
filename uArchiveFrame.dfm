object ArchiveFrame: TArchiveFrame
  Left = 0
  Top = 0
  Width = 1022
  Height = 581
  Align = alClient
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -13
  Font.Name = 'Tahoma'
  Font.Style = []
  ParentFont = False
  TabOrder = 0
  object ArcPanel: TPanel
    Left = 0
    Top = 0
    Width = 1022
    Height = 41
    Align = alTop
    TabOrder = 2
    object ClosePeriodButton: TButton
      Left = 8
      Top = 8
      Width = 200
      Height = 25
      Caption = 'Заархивировать период'
      TabOrder = 0
      OnClick = ClosePeriodButtonClick
    end
  end
  object PaymentsArcGrid: TDBGrid
    Left = 0
    Top = 41
    Width = 1022
    Height = 290
    Align = alTop
    TabOrder = 0
    TitleFont.Charset = DEFAULT_CHARSET
    TitleFont.Color = clWindowText
    TitleFont.Height = -13
    TitleFont.Name = 'Tahoma'
    TitleFont.Style = []
  end
  object ArcSplitter: TSplitter
    Left = 0
    Top = 331
    Width = 1022
    Height = 5
    Cursor = crVSplit
    Align = alTop
    ExplicitWidth = 1020
  end
  object ExpensesArcGrid: TDBGrid
    Left = 0
    Top = 336
    Width = 1022
    Height = 245
    Align = alClient
    TabOrder = 1
    TitleFont.Charset = DEFAULT_CHARSET
    TitleFont.Color = clWindowText
    TitleFont.Height = -13
    TitleFont.Name = 'Tahoma'
    TitleFont.Style = []
  end
end
