# TailorSend Financial Model — Google Sheets Setup

**Michigan SBDC · Bootstrap scenario**

Import the three CSV files into one Google Sheet workbook (one tab each):

| Tab name | File |
|----------|------|
| `Assumptions` | `financial-model-assumptions.csv` |
| `Monthly` | `financial-model-monthly.csv` |
| `Annual` | `financial-model-annual.csv` |

**File → Import → Upload** each CSV, or create a new Sheet and paste.

---

## Option A — Use pre-filled monthly data (fastest)

The `financial-model-monthly.csv` tab already contains **12 months** of conservative Year 1 projections. Edit **Assumptions** and manually adjust Monthly if you change growth rates.

Highlight these columns in **yellow** on the Monthly tab (your editable inputs if you rebuild formulas):

- New Signups (column B) — or drive from growth formula below

---

## Option B — Formula-driven Monthly tab (recommended)

Delete data rows 2–13 on the Monthly tab and rebuild with formulas. Assumptions live in tab `Assumptions` (use `$B$` absolute refs).

### Row 1 headers (already in CSV)
`Month | New Signups | Registered Users | Paying Users | MRR | Monthly Revenue | COGS | Stripe Fees | Gross Profit | Marketing | Owner Draw | Infrastructure | Other Fixed | Total OpEx | Net Income | Cumulative Cash`

### Key assumption cells

| Assumption | Cell |
|------------|------|
| Bootstrap capital | `Assumptions!B2` |
| Student Monthly price | `Assumptions!B8` |
| Blended ARPU | `Assumptions!B16` |
| COGS per kit | `Assumptions!B17` |
| Stripe rate | `Assumptions!B18` |
| Starting users | `Assumptions!B21` |
| Conversion | `Assumptions!B22` |
| Churn | `Assumptions!B23` |
| Marketing (organic) | `Assumptions!B29` |
| Owner draw start month | `Assumptions!B32` |
| Owner draw amount | `Assumptions!B33` |
| Hosting | `Assumptions!B26` |
| OpenAI base | `Assumptions!B27` |
| Legal / misc | `Assumptions!B30` |

### Column formulas (row 2 = month 1, copy down to row 13)

**A2 (Month):**
```
=ROW()-1
```

**B2 (New Signups):**
```
=IF(A2=1, Assumptions!B21, ROUND(B1*1.15))
```
*~15% month-over-month signup growth after launch; tune to taste.*

**C2 (Registered Users):**
```
=IF(A2=1, B2, C1+B2)
```

**D2 (Paying Users):**
```
=MIN(C2*Assumptions!B22, IF(A2=1, B2*Assumptions!B22, D1*(1-Assumptions!B23)+B2*Assumptions!B22*0.3))
```

**E2 (MRR):**
```
=D2*Assumptions!B16
```

**F2 (Monthly Revenue):**
```
=E2
```

**G2 (COGS):**
```
=D2*12*Assumptions!B17/12
```

**H2 (Stripe Fees):**
```
=F2*Assumptions!B18
```

**I2 (Gross Profit):**
```
=F2-G2-H2
```

**J2 (Marketing):**
```
=Assumptions!B29 + IF(A2>6, 50, 0)
```

**K2 (Owner Draw):**
```
=IF(A2>=Assumptions!B32, Assumptions!B33, 0)
```

**L2 (Infrastructure):**
```
=Assumptions!B26 + Assumptions!B27 + G2*0.5
```

**M2 (Other Fixed):**
```
=Assumptions!B30
```

**N2 (Total OpEx):**
```
=J2+K2+L2+M2
```

**O2 (Net Income):**
```
=I2-N2
```

**P2 (Cumulative Cash):**
```
=IF(A2=1, Assumptions!B2+O2, P1+O2)
```

Copy **A2:P2** down through row 13 (month 12).

---

## Annual tab formulas

Link to Monthly totals (Year 1 = months 1–12):

**Year 1 Revenue:**
```
=SUM(Monthly!F2:F13)
```

**Year 1 COGS:**
```
=SUM(Monthly!G2:G13)
```

**Year 1 Marketing:**
```
=SUM(Monthly!J2:J13)
```

**Year 1 Owner compensation:**
```
=SUM(Monthly!K2:K13)
```

**Year 1 Net income:**
```
=SUM(Monthly!O2:O13)
```

**Cash at end of Year 1:**
```
=Monthly!P13
```

Year 2 and Year 3 figures in `financial-model-annual.csv` are directional projections assuming SBDC-supported growth.

---

## Unit economics tab (optional 4th sheet)

| Metric | Formula |
|--------|---------|
| ARPU | `=Assumptions!B16` |
| COGS/kit | `=Assumptions!B17` |
| Gross margin % | `=(ARPU-12*COGS_per_kit)/ARPU` assuming 12 kits/mo |
| LTV (months) | `=1/Assumptions!B23` |
| LTV ($) | `=LTV_months*ARPU*0.76` |
| CAC | `=SUM(Monthly!J2:J13)/MAX(Monthly!D13-Monthly!D1,1)` Year 1 |
| LTV:CAC | `=LTV/CAC` |

---

## Bootstrap capital use ($12K)

| Category | Est. Year 1 |
|----------|-------------|
| Hosting & infra | ~$3,000 |
| AI API costs | ~$2,000 |
| Marketing (organic) | ~$3,450 |
| Legal & accounting | ~$900 |
| Runway buffer (M12) | ~$524 remaining |

---

## Charts to add in Google Sheets

1. **MRR ramp** — Line chart: Month (A) vs MRR (E)
2. **Cash runway** — Line chart: Month (A) vs Cumulative Cash (P)
3. **User growth** — Area chart: Registered (C) + Paying (D)
4. **Bootstrap use** — Pie chart from table above

---

## Tips for SBDC meetings

- Yellow cells = assumptions you can stress-test live ("what if conversion is 10%?")
- Show honest Year 1 numbers: ~$336 MRR, 24 paying users, ~$524 cash remaining
- Discuss when owner draw starts (month 9) and that revenue does not yet cover full living expenses
- Ask SBDC consultant to review conversion assumptions and Michigan campus GTM strategy
