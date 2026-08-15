object MainForm: TMainForm
  Left = 0
  Top = 0
  Caption = #1064#1082#1086#1083#1100#1085#1099#1077' '#1088#1072#1089#1093#1086#1076#1099
  ClientHeight = 625
  ClientWidth = 1030
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -11
  Font.Name = 'Tahoma'
  Font.Style = []
  Position = poScreenCenter
  OnClose = MainFormClose
  TextHeight = 13
  object StatusLabel: TLabel
    Left = 0
    Top = 612
    Width = 1030
    Height = 13
    Align = alBottom
    Layout = tlCenter
    ExplicitWidth = 3
  end
  object PageControl: TPageControl
    Left = 0
    Top = 0
    Width = 1030
    Height = 612
    ActivePage = ExpensesTab
    Align = alClient
    Font.Charset = DEFAULT_CHARSET
    Font.Color = clWindowText
    Font.Height = -13
    Font.Name = 'Tahoma'
    Font.Style = []
    ParentFont = False
    TabOrder = 0
    ExplicitWidth = 1028
    ExplicitHeight = 604
    object PupilsTab: TTabSheet
      Caption = #1059#1095#1077#1085#1080#1082#1080
    end
    object PaymentsTab: TTabSheet
      Caption = #1057#1076#1072#1085#1085#1099#1077' '#1076#1077#1085#1100#1075#1080
      ImageIndex = 1
    end
    object ExpensesTab: TTabSheet
      Caption = #1055#1086#1090#1088#1072#1095#1077#1085#1085#1099#1077' '#1076#1077#1085#1100#1075#1080
      ImageIndex = 2
    end
    object ArchiveTab: TTabSheet
      Caption = #1040#1088#1093#1080#1074
      ImageIndex = 3
    end
  end
end
