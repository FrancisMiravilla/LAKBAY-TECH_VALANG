import sqlite3
conn = sqlite3.connect('C:/Users/Francis/LAKBAY/backend/db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table';")
for row in cur.fetchall():
    print(f"Table: {row[0]}")
    print(f"SQL: {row[1]}")
