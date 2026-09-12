import re

schema_path = "/Users/macbook/.gemini/antigravity-ide/scratch/family-finance/apps/api/prisma/schema.prisma"

with open(schema_path, "r") as f:
    content = f.read()

# Change provider
content = re.sub(r'provider\s*=\s*"postgresql"', 'provider = "sqlite"', content)

# Remove @db.Decimal annotations
content = re.sub(r'@db\.Decimal\(\d+,\s*\d+\)', '', content)

# Replace Decimal with Float
content = re.sub(r'\bDecimal\b', 'Float', content)

with open(schema_path, "w") as f:
    f.write(content)

print("Schema updated successfully.")
