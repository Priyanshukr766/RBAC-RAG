# Excel Row Splitting: Complete Input and Output Example

## 1. Sample Excel input

Suppose we have an Excel file named `company_employees.xlsx`.

It contains two sheets.

### Sheet 1: Employees

  -----------------------------------------------------------------------------------------------
  Employee_ID   Name     Department    Location      Base_Salary       Bonus   Performance_Rating
  ------------- -------- ------------- ----------- ------------- ----------- --------------------
  E101          Neha     Engineering   Ahmedabad         1200000      150000                  4.5
                Sharma                                                       

  E102          Rahul    Finance       Mumbai            1000000      100000                  4.2
                Patel                                                        

  E103          Priya    HR            Pune               900000       80000                  4.8
                Shah                                                         
  -----------------------------------------------------------------------------------------------

### Sheet 2: Department_Budgets

  Dept_ID   Department    Location      Annual_Budget   Headcount
  --------- ------------- ----------- --------------- -----------
  D01       Engineering   Ahmedabad          50000000         120
  D02       Finance       Mumbai             20000000          45

## 2. Function input (arguments)

Now suppose the admin uploads this Excel file and provides the following
configuration to the function:

``` python
excel_path = "company_employees.xlsx"

doc_id = "DOC_001"

anchor_columns = [
    "Employee_ID",
    "Name"
]

public_columns = [
    "Employee_ID",
    "Name",
    "Department",
    "Location"
]

public_roles = [
    "hr",
    "finance",
    "engineering"
]

restricted_column_map = {
    "Base_Salary": ["hr"],
    "Bonus": ["hr"],
    "Performance_Rating": ["hr", "manager"],
    "Annual_Budget": ["finance"],
    "Headcount": ["finance", "manager"]
}
```

### Meaning of this configuration

  -----------------------------------------------------------------------
  Configuration                       Meaning
  ----------------------------------- -----------------------------------
  `anchor_columns`                    Employee ID and Name identify the
                                      employee.

  `public_columns`                    Employee ID, Name, Department and
                                      Location go into the public chunk.

  `public_roles`                      HR, Finance and Engineering can
                                      access public chunks.

  `restricted_column_map`             Defines which roles can access each
                                      restricted column.
  -----------------------------------------------------------------------

For simplicity, assume these role strings are valid `AllowedRole` values
in your application.

## 3. What happens to the first employee?

Let's take Neha's row:

  Column               Value
  -------------------- -------------
  Employee_ID          E101
  Name                 Neha Sharma
  Department           Engineering
  Location             Ahmedabad
  Base_Salary          1200000
  Bonus                150000
  Performance_Rating   4.5

### Step A: Anchor information

The code collects:

``` python
anchor_parts = [
    "Employee_ID: E101",
    "Name: Neha Sharma"
]
```

Then joins them:

``` python
anchor_str = "Employee_ID: E101 | Name: Neha Sharma"
```

### Step B: Public information

The code skips Employee_ID and Name because they are already anchors.

It collects:

``` python
public_parts = [
    "Department: Engineering",
    "Location: Ahmedabad"
]
```

It combines anchor and public information:

``` python
pub_body = (
    "Employee_ID: E101 | Name: Neha Sharma | "
    "Department: Engineering | Location: Ahmedabad"
)
```

This creates the first chunk.

### Step C: Group restricted information

The code checks each restricted column.

It produces:

``` python
role_groups = {
    ("hr",): [
        "Base_Salary: 1200000",
        "Bonus: 150000"
    ],
    ("hr", "manager"): [
        "Performance_Rating: 4.5"
    ]
}
```

Notice that Salary and Bonus are grouped because both have the same
allowed role: HR.

Performance Rating gets a separate group because its allowed roles are
HR and Manager.

This creates two more chunks.

So, Neha produces 3 chunks:

1.  Public chunk.
2.  HR-only chunk.
3.  HR + Manager chunk.

## 4. Complete output for all employees

The function processes every employee row and creates three chunks per
employee.

### Employee E101 --- Neha Sharma

#### Chunk index: 0 --- Public

**Allowed roles:** `["hr", "finance", "engineering"]`

``` text
[Section: Sheet: Employees (Row 2 - General)]
Employee_ID: E101 | Name: Neha Sharma |
Department: Engineering | Location: Ahmedabad
```

#### Chunk index: 1 --- Restricted

**Allowed roles:** `["hr"]`

``` text
[Section: Sheet: Employees (Row 2 - Confidential)]
Employee_ID: E101 | Name: Neha Sharma |
Base_Salary: 1200000 | Bonus: 150000
```

#### Chunk index: 2 --- Restricted

**Allowed roles:** `["hr", "manager"]`

``` text
[Section: Sheet: Employees (Row 2 - Confidential)]
Employee_ID: E101 | Name: Neha Sharma |
Performance_Rating: 4.5
```

### Employee E102 --- Rahul Patel

#### Chunk index: 3 --- Public

**Allowed roles:** `["hr", "finance", "engineering"]`

``` text
[Section: Sheet: Employees (Row 3 - General)]
Employee_ID: E102 | Name: Rahul Patel |
Department: Finance | Location: Mumbai
```

#### Chunk index: 4 --- Restricted

**Allowed roles:** `["hr"]`

``` text
[Section: Sheet: Employees (Row 3 - Confidential)]
Employee_ID: E102 | Name: Rahul Patel |
Base_Salary: 1000000 | Bonus: 100000
```

#### Chunk index: 5 --- Restricted

**Allowed roles:** `["hr", "manager"]`

``` text
[Section: Sheet: Employees (Row 3 - Confidential)]
Employee_ID: E102 | Name: Rahul Patel |
Performance_Rating: 4.2
```

### Employee E103 --- Priya Shah

#### Chunk index: 6 --- Public

**Allowed roles:** `["hr", "finance", "engineering"]`

``` text
[Section: Sheet: Employees (Row 4 - General)]
Employee_ID: E103 | Name: Priya Shah |
Department: HR | Location: Pune
```

#### Chunk index: 7 --- Restricted

**Allowed roles:** `["hr"]`

``` text
[Section: Sheet: Employees (Row 4 - Confidential)]
Employee_ID: E103 | Name: Priya Shah |
Base_Salary: 900000 | Bonus: 80000
```

#### Chunk index: 8 --- Restricted

**Allowed roles:** `["hr", "manager"]`

``` text
[Section: Sheet: Employees (Row 4 - Confidential)]
Employee_ID: E103 | Name: Priya Shah |
Performance_Rating: 4.8
```

## 5. What about the second sheet?

This is an important detail in your code.

Your second sheet contains:

  Dept_ID   Department    Location      Annual_Budget   Headcount
  --------- ------------- ----------- --------------- -----------
  D01       Engineering   Ahmedabad          50000000         120
  D02       Finance       Mumbai             20000000          45

But your function still expects these anchor columns:

``` python
anchor_columns = ["Employee_ID", "Name"]
```

Neither column exists in `Department_Budgets`.

Therefore:

``` python
if not anchor_parts:
    continue
```

skips both rows.

**Result:** The entire `Department_Budgets` sheet produces zero chunks.

This is a limitation of the current implementation: it uses the same
anchor columns for every sheet.

## 6. Final return value

After processing all sheets, the function returns:

``` python
return chunks
```

Conceptually, the returned list contains these nine `ChunkRecord`
objects:

``` python
chunks = [
    ChunkRecord(
        doc_id="DOC_001",
        parent_block_id=None,
        chunk_index=0,
        content="[Section: Sheet: Employees (Row 2 - General)] Employee_ID: E101 | Name: Neha Sharma | Department: Engineering | Location: Ahmedabad",
        allowed_roles=["hr", "finance", "engineering"],
        page_number=1,
        bbox=None,
        section_heading="Sheet: Employees (Row 2 - General)"
    ),

    ChunkRecord(
        doc_id="DOC_001",
        parent_block_id=None,
        chunk_index=1,
        content="[Section: Sheet: Employees (Row 2 - Confidential)] Employee_ID: E101 | Name: Neha Sharma | Base_Salary: 1200000 | Bonus: 150000",
        allowed_roles=["hr"],
        page_number=1,
        bbox=None,
        section_heading="Sheet: Employees (Row 2 - Confidential)"
    ),

    ChunkRecord(
        doc_id="DOC_001",
        parent_block_id=None,
        chunk_index=2,
        content="[Section: Sheet: Employees (Row 2 - Confidential)] Employee_ID: E101 | Name: Neha Sharma | Performance_Rating: 4.5",
        allowed_roles=["hr", "manager"],
        page_number=1,
        bbox=None,
        section_heading="Sheet: Employees (Row 2 - Confidential)"
    ),

    # Rahul's three chunks: indexes 3, 4, 5
    # Priya's three chunks: indexes 6, 7, 8
]
```

The comments above abbreviate Rahul and Priya's entries; their full
contents are shown in the examples above.
