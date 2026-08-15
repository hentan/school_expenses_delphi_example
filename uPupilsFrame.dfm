object PupilsFrame: TPupilsFrame
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
  object PupilsPanel: TPanel
    Left = 0
    Top = 0
    Width = 1022
    Height = 106
    Align = alTop
    BevelOuter = bvNone
    TabOrder = 0
    object Label5: TLabel
      Left = 12
      Top = 44
      Width = 61
      Height = 11
      Caption = #1060#1048#1054' '#1091#1095#1077#1085#1080#1082#1072
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -9
      Font.Name = 'Tahoma'
      Font.Style = []
      ParentFont = False
    end
    object Label6: TLabel
      Left = 170
      Top = 44
      Width = 59
      Height = 11
      Caption = #1055#1086#1089#1083#1077' '#1091#1088#1086#1082#1086#1074
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -9
      Font.Name = 'Tahoma'
      Font.Style = []
      ParentFont = False
    end
    object Label7: TLabel
      Left = 328
      Top = 44
      Width = 42
      Height = 11
      Caption = #1056#1086#1076#1080#1090#1077#1083#1100
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -9
      Font.Name = 'Tahoma'
      Font.Style = []
      ParentFont = False
    end
    object Label8: TLabel
      Left = 506
      Top = 44
      Width = 39
      Height = 11
      Caption = #1058#1077#1083#1077#1092#1086#1085
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -9
      Font.Name = 'Tahoma'
      Font.Style = []
      ParentFont = False
    end
    object PupilFullNameEdit: TEdit
      Left = 12
      Top = 12
      Width = 150
      Height = 24
      TabOrder = 0
      TextHint = #1060#1048#1054' '#1091#1095#1077#1085#1080#1082#1072
    end
    object AfterLessonEdit: TEdit
      Left = 170
      Top = 12
      Width = 150
      Height = 24
      TabOrder = 1
      TextHint = #1055#1086#1089#1083#1077' '#1091#1088#1086#1082#1086#1074
    end
    object ParentNameEdit: TEdit
      Left = 326
      Top = 10
      Width = 170
      Height = 24
      TabOrder = 2
      TextHint = #1056#1086#1076#1080#1090#1077#1083#1100
    end
    object ParentPhoneEdit: TEdit
      Left = 502
      Top = 10
      Width = 150
      Height = 24
      TabOrder = 3
      TextHint = #1058#1077#1083#1077#1092#1086#1085
    end
    object AddPupilButton: TButton
      Left = 12
      Top = 64
      Width = 120
      Height = 32
      Caption = #1044#1086#1073#1072#1074#1080#1090#1100
      TabOrder = 4
      OnClick = AddPupilClick
    end
    object RefreshButton: TButton
      Left = 138
      Top = 64
      Width = 120
      Height = 32
      Caption = #1054#1073#1085#1086#1074#1080#1090#1100
      TabOrder = 5
      OnClick = RefreshClick
    end
    object DeletePupilButton: TButton
      Left = 264
      Top = 64
      Width = 120
      Height = 32
      Caption = #1059#1076#1072#1083#1080#1090#1100
      TabOrder = 6
      OnClick = DeletePupilClick
    end
  end
  object PupilsGrid: TDBGrid
    Left = 0
    Top = 106
    Width = 1022
    Height = 475
    Align = alClient
    TabOrder = 1
    TitleFont.Charset = DEFAULT_CHARSET
    TitleFont.Color = clWindowText
    TitleFont.Height = -13
    TitleFont.Name = 'Tahoma'
    TitleFont.Style = []
    OnDblClick = PupilsGridDbClick
  end
end
