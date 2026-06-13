const fs = require('fs');

let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// 1. Change @db.Uuid to normal String, and gen_random_uuid() to cuid()
schema = schema.replace(/@id @default\(dbgenerated\("gen_random_uuid\(\)"\)\) @db\.Uuid/g, '@id @default(cuid())');
schema = schema.replace(/@id @db\.Uuid/g, '@id @default(cuid())');
schema = schema.replace(/@db\.Uuid/g, '');

// 2. Add updatedAt to models missing it
const addUpdatedAt = (modelContent) => {
    if (!modelContent.includes('updatedAt')) {
        return modelContent.replace(/}\s*$/, '  updatedAt DateTime @updatedAt @map("updated_at")\n}\n');
    }
    return modelContent;
}

// We'll just manually add updatedAt to Payment, SystemLog, Broadcast, RentLedger, User
schema = schema.replace(/model Payment \{([\s\S]*?)\}/, (match) => addUpdatedAt(match));
schema = schema.replace(/model SystemLog \{([\s\S]*?)\}/, (match) => addUpdatedAt(match));
schema = schema.replace(/model Broadcast \{([\s\S]*?)\}/, (match) => addUpdatedAt(match));
schema = schema.replace(/model RentLedger \{([\s\S]*?)\}/, (match) => {
    if (!match.includes('updatedAt')) {
        return match.replace(/@@/, 'updatedAt DateTime @updatedAt\n\n  @@');
    }
    return match;
});
schema = schema.replace(/model User \{([\s\S]*?)\}/, (match) => {
    if (!match.includes('updatedAt')) {
        return match.replace(/@@/, 'updatedAt DateTime @updatedAt\n\n  @@');
    }
    return match;
});

// 3. Fix VacateNotice tenant one-to-one
schema = schema.replace(/tenantId\s+String\s+@map\("tenant_id"\)/, 'tenantId String @unique @map("tenant_id")');
schema = schema.replace(/vacateNotices\s+VacateNotice\[\]/, 'vacateNotice VacateNotice?');

// 4. Add missing relations to Payment
schema = schema.replace(/invoiceId\s+String\s+@map\("invoice_id"\)/, 'invoiceId String? @map("invoice_id")\n  tenantId String @map("tenant_id")\n  ledgerId String? @map("ledger_id")');
schema = schema.replace(/invoice\s+Invoice\s+@relation\(fields: \[invoiceId\], references: \[id\]\)/, 'invoice Invoice? @relation(fields: [invoiceId], references: [id])\n  tenant Tenant @relation(fields: [tenantId], references: [id])\n  ledger RentLedger? @relation(fields: [ledgerId], references: [id])');

// Add payments to Tenant and RentLedger
schema = schema.replace(/rentLedgers\s+RentLedger\[\]/, 'rentLedgers RentLedger[]\n  payments Payment[]');
schema = schema.replace(/model RentLedger \{([\s\S]*?)\}/, (match) => {
    if (!match.includes('payments Payment[]')) {
        return match.replace(/@@/, 'payments Payment[]\n\n  @@');
    }
    return match;
});

// 5. Add missing indexes
// User -> role
schema = schema.replace(/model User \{([\s\S]*?)@@index\(\[branchId\]\)/, '$1@@index([branchId])\n  @@index([role])');
// Payment -> tenantId, ledgerId
schema = schema.replace(/model Payment \{([\s\S]*?)@@map\("payments"\)/, '$1@@index([tenantId])\n  @@index([ledgerId])\n  @@map("payments")');
// Admission -> tenantId
schema = schema.replace(/model Admission \{([\s\S]*?)@@index\(\[roomId, status\]\)/, '$1@@index([roomId, status])\n  @@index([tenantId])');
// Invoice -> tenantId
schema = schema.replace(/model Invoice \{([\s\S]*?)@@map\("invoices"\)/, '$1@@index([tenantId])\n  @@map("invoices")');

fs.writeFileSync('backend/prisma/schema.prisma', schema);
