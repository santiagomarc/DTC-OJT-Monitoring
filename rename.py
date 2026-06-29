import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content.replace('studentId', 'internId')
    new_content = new_content.replace('StudentId', 'InternId')
    new_content = new_content.replace('student_id', 'intern_id')
    new_content = new_content.replace('studentToSheets', 'internToSheets')
    new_content = new_content.replace('studentFromSheets', 'internFromSheets')
    new_content = new_content.replace('deleteStudent', 'deleteIntern')
    new_content = new_content.replace('syncStudent', 'syncIntern')

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filepath in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    replace_in_file(filepath)

