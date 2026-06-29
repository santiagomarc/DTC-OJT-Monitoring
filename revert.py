import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content.replace('intern_id', 'student_id')

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Reverted {filepath}")

for filepath in glob.glob('src/**/*.ts', recursive=True) + glob.glob('src/**/*.tsx', recursive=True):
    replace_in_file(filepath)

