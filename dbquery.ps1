<#
  dbquery — консольная утилита для быстрого чтения базы foura (SQL Server).
  Предназначена для AI-агента: выполняет SQL и печатает результат в stdout
  таблицей или CSV, не требуя запуска основного Delphi-приложения.

  Безопасность: по умолчанию режим «только чтение» — разрешены пакеты,
  начинающиеся с SELECT/WITH/DECLARE/USE/SET/PRINT, всё выполняется
  в транзакции с ROLLBACK. Изменения (и EXEC) — только с явным ключом -Rw.
#>

param(
  [string]$Query,
  [string]$File,
  [string]$Server = 'localhost',
  [string]$Database = 'foura',
  [int]$Top = 100,
  [int]$Timeout = 30,
  [switch]$Csv,
  [switch]$Rw,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

# EXEC не в списке: под ним можно выполнить любую запись, в readonly он запрещён.
# Проверка по первому слову — не гарантия (DECLARE ...; UPDATE пройдёт),
# поэтому вторая линия обороны — транзакция с ROLLBACK.
$ReadOnlyAllowList = @('SELECT', 'WITH', 'DECLARE', 'USE', 'SET', 'PRINT')

function Show-Help {
  @'
dbquery - чтение базы SQL Server из командной строки (по умолчанию localhost/foura)

Использование:
  dbquery -q "<SQL>"
  dbquery -f <файл.sql>
  <запрос.sql | dbquery

Параметры:
  -q <sql>        текст запроса; несколько пакетов разделяются строкой GO
  -f <файл>       прочитать SQL из файла (UTF-8)
  -server <имя>   сервер (по умолчанию localhost)
  -db <база>      база данных (по умолчанию foura)
  -top <N>        максимум строк на результирующий набор (по умолчанию 100, 0 = без ограничения)
  -timeout <сек>  таймаут выполнения команды (по умолчанию 30)
  -csv            вывод в формате CSV (по умолчанию - таблица с выравниванием)
  -rw             разрешить изменение данных (по умолчанию только чтение + ROLLBACK)
  -help           эта справка

Коды возврата: 0 - успех, 1 - ошибка выполнения, 2 - ошибка использования / запрет записи.

Примеры:
  dbquery -q "SELECT TOP 5 * FROM outlay ORDER BY id DESC"
  dbquery -q "SELECT id, children_name FROM parents_and_children" -csv -top 20
  dbquery -f script.sql -db foura_tests
  dbquery -q "UPDATE outlay SET summ = 100 WHERE id = 1" -rw
'@
}

function Get-FirstKeyword([string]$Sql) {
  # Первый ключевое слово пакета: пропускаем пробелы, скобки, точки с запятой
  # и комментарии (-- и /* */).
  $s = $Sql
  while ($true) {
    $s = $s.TrimStart()
    if ($s.Length -eq 0) { return '' }
    if ($s.StartsWith('--')) {
      $idx = $s.IndexOf("`n")
      if ($idx -lt 0) { return '' }
      $s = $s.Substring($idx + 1)
      continue
    }
    if ($s.StartsWith('/*')) {
      $idx = $s.IndexOf('*/')
      if ($idx -lt 0) { return '' }
      $s = $s.Substring($idx + 2)
      continue
    }
    if ($s.StartsWith('(') -or $s.StartsWith(';')) {
      $s = $s.Substring(1)
      continue
    }
    break
  }
  return [Regex]::Match($s, '^[A-Za-z_]+').Value.ToUpperInvariant()
}

function Escape-Csv([string]$Value) {
  if ($Value -match '[",\r\n]') {
    return '"' + $Value.Replace('"', '""') + '"'
  }
  return $Value
}

function Format-CellText($Value) {
  if ($Value -is [byte[]]) { return '<binary>' }
  if ($Value -is [datetime]) {
    if ($Value.TimeOfDay.TotalSeconds -eq 0) { return $Value.ToString('yyyy-MM-dd') }
    return $Value.ToString('yyyy-MM-dd HH:mm:ss')
  }
  return [string]$Value
}

function Show-ResultSet([System.Data.SqlClient.SqlDataReader]$Reader, [switch]$Csv, [int]$Top) {
  $fc = $Reader.FieldCount
  if ($fc -eq 0) { return }

  $headers = New-Object string[] $fc
  for ($i = 0; $i -lt $fc; $i++) { $headers[$i] = $Reader.GetName($i) }

  $rows = New-Object System.Collections.Generic.List[string[]]
  $truncated = $false
  while ($true) {
    if (-not $Reader.Read()) { break }
    if (($Top -gt 0) -and ($rows.Count -ge $Top)) { $truncated = $true; break }
    $cells = New-Object string[] $fc
    for ($i = 0; $i -lt $fc; $i++) {
      if ($Reader.IsDBNull($i)) { $cells[$i] = 'NULL' }
      else { $cells[$i] = Format-CellText $Reader.GetValue($i) }
    }
    $rows.Add($cells)
  }

  $sb = New-Object System.Text.StringBuilder

  if ($Csv) {
    [void]$sb.AppendLine((@($headers | ForEach-Object { Escape-Csv $_ }) -join ','))
    foreach ($r in $rows) {
      [void]$sb.AppendLine((@($r | ForEach-Object { Escape-Csv $_ }) -join ','))
    }
  } else {
    # Ширина колонки: максимум по заголовку и значениям, но не больше 60.
    $widths = New-Object int[] $fc
    for ($i = 0; $i -lt $fc; $i++) { $widths[$i] = [Math]::Min(60, $headers[$i].Length) }
    foreach ($r in $rows) {
      for ($i = 0; $i -lt $fc; $i++) {
        $w = [Math]::Min(60, $r[$i].Length)
        if ($w -gt $widths[$i]) { $widths[$i] = $w }
      }
    }
    $lineParts = New-Object string[] $fc
    for ($i = 0; $i -lt $fc; $i++) {
      $v = $headers[$i]
      if ($v.Length -gt $widths[$i]) { $v = $v.Substring(0, $widths[$i]) }
      $lineParts[$i] = $v.PadRight($widths[$i])
    }
    [void]$sb.AppendLine(($lineParts -join '  ').TrimEnd())
    for ($i = 0; $i -lt $fc; $i++) { $lineParts[$i] = ('-' * $widths[$i]) }
    [void]$sb.AppendLine($lineParts -join '  ')
    foreach ($r in $rows) {
      for ($i = 0; $i -lt $fc; $i++) {
        $v = $r[$i]
        if ($v.Length -gt $widths[$i]) { $v = $v.Substring(0, $widths[$i] - 1) + '~' }
        $lineParts[$i] = $v.PadRight($widths[$i])
      }
      [void]$sb.AppendLine(($lineParts -join '  ').TrimEnd())
    }
  }

  [Console]::Out.Write($sb.ToString())

  if ($rows.Count -eq 0) {
    [Console]::Error.WriteLine('(0 строк)')
  }
  if ($truncated) {
    [Console]::Error.WriteLine("(показаны первые $Top строк; используйте -top 0 или уточните запрос)")
  }
}

# --- Основной блок -------------------------------------------------------

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

if ($Help) { Show-Help; exit 0 }

if ($Query -and $File) {
  [Console]::Error.WriteLine('Укажите что-то одно: -q или -f')
  exit 2
}

if (-not $Query -and -not $File -and [Console]::IsInputRedirected) {
  $Query = [Console]::In.ReadToEnd()
}

if ($File) {
  if (-not (Test-Path -LiteralPath $File)) {
    [Console]::Error.WriteLine("Файл не найден: $File")
    exit 2
  }
  $Query = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $File).Path)
}

if (-not $Query -or -not $Query.Trim()) {
  [Console]::Error.WriteLine('Пустой запрос. Справка: dbquery -help')
  exit 2
}

function Split-Batches([string]$Sql) {
  # Разбивка на батчи по строке-разделителю GO (как в SSMS/sqlcmd):
  # регистр не важен, допустимы отступы и число повторов "GO N".
  # Ограничение то же, что у sqlcmd: строка 'GO' внутри многострочного
  # строкового литерала ошибочно посчитается разделителем.
  $result = New-Object System.Collections.Generic.List[string]
  $sb = New-Object System.Text.StringBuilder
  foreach ($line in ($Sql -split "`r`n|`n|`r")) {
    if ($line -match '^[\t ]*GO([\t ]+\d+)?[\t ]*$') {
      $n = 1
      if ($Matches[1]) { $n = [int]$Matches[1] }
      $text = $sb.ToString()
      if ($text.Trim().Length -gt 0) {
        for ($i = 0; $i -lt $n; $i++) { $result.Add($text) }
      }
      [void]$sb.Clear()
    } else {
      [void]$sb.AppendLine($line)
    }
  }
  $tail = $sb.ToString()
  if ($tail.Trim().Length -gt 0) { $result.Add($tail) }
  return ,$result
}

$batches = Split-Batches $Query

# Валидация режима «только чтение» до открытия соединения.
if (-not $Rw) {
  foreach ($b in $batches) {
    $kw = Get-FirstKeyword $b
    if ($ReadOnlyAllowList -notcontains $kw) {
      [Console]::Error.WriteLine(
        "Режим только чтение: пакет начинается с '$kw'. " +
        "Разрешены: $($ReadOnlyAllowList -join '/'). Для изменения данных укажите -Rw.")
      exit 2
    }
  }
}

$connString = "Data Source=$Server;Initial Catalog=$Database;" +
  'Integrated Security=True;Encrypt=False;TrustServerCertificate=True;' +
  'Connect Timeout=15;Application Name=dbquery'

$conn = New-Object System.Data.SqlClient.SqlConnection($connString)
$tx = $null

try {
  $conn.Open()

  # Чтение всегда в транзакции с откатом: гарантия отсутствия побочных эффектов.
  if (-not $Rw) { $tx = $conn.BeginTransaction('dbquery_readonly') }

  foreach ($b in $batches) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $b
    $cmd.CommandTimeout = $Timeout
    if ($tx) { $cmd.Transaction = $tx }

    # ExecuteReader выполняет любой батч (SELECT, UPDATE, EXEC, DECLARE+SELECT):
    # наборы строк печатаются, число затронутых строк берём из RecordsAffected.
    $reader = $cmd.ExecuteReader()
    try {
      do { Show-ResultSet $Reader -Csv:$Csv -Top:$Top } while ($reader.NextResult())
      $affected = $reader.RecordsAffected
    } finally {
      $reader.Close()
    }
    if ($affected -ge 0) {
      [Console]::Error.WriteLine("(затронуто строк: $affected)")
    }
  }
  exit 0
} catch {
  $msg = $_.Exception.Message
  $e = $_.Exception
  while ($e.InnerException) {
    $e = $e.InnerException
    $msg += ' -> ' + $e.Message
  }
  [Console]::Error.WriteLine('ОШИБКА: ' + $msg)
  exit 1
} finally {
  if ($tx) {
    try { $tx.Rollback() } catch { }
  }
  $conn.Dispose()
}
