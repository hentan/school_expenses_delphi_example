object BaseEditForm: TBaseEditForm
  Left = 0
  Top = 0
  Caption = #1056#1077#1076#1072#1082#1090#1080#1088#1086#1074#1072#1085#1080#1077
  ClientHeight = 441
  ClientWidth = 317
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -12
  Font.Name = 'Segoe UI'
  Font.Style = []
  TextHeight = 15
  object Label1: TLabel
    Left = 24
    Top = 68
    Width = 185
    Height = 15
    Caption = #1044#1072#1090#1072
  end
  object Label2: TLabel
    Left = 24
    Top = 124
    Width = 185
    Height = 15
    Caption = #1053#1072#1079#1085#1072#1095#1077#1085#1080#1077
  end
  object Label3: TLabel
    Left = 24
    Top = 180
    Width = 185
    Height = 15
    Caption = #1057#1091#1084#1084#1072
  end
  object Edit1: TEdit
    Left = 24
    Top = 88
    Width = 185
    Height = 23
    TabOrder = 0
    TextHint = #1044#1072#1090#1072' ('#1043#1043#1043#1043#1052#1052#1044#1044')'
  end
  object Edit2: TEdit
    Left = 24
    Top = 144
    Width = 185
    Height = 23
    TabOrder = 1
    TextHint = #1053#1072#1079#1085#1072#1095#1077#1085#1080#1077
  end
  object Edit3: TEdit
    Left = 24
    Top = 200
    Width = 185
    Height = 23
    TabOrder = 2
    TextHint = #1057#1091#1084#1084#1072
  end
  object Button1: TButton
    Left = 24
    Top = 248
    Width = 75
    Height = 25
    Caption = #1054#1050
    TabOrder = 3
    OnClick = Button1Click
  end
  object Button2: TButton
    Left = 134
    Top = 248
    Width = 75
    Height = 25
    Caption = #1054#1090#1084#1077#1085#1072
    TabOrder = 4
    ModalResult = 2
  end
end
