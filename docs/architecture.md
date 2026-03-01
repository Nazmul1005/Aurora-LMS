# LMS Simulation – Architecture Overview

## Entities & Data
- **LMS Organisation**: hosts 5 curated courses, receives learner payments, pays instructors lump-sum per upload, maintains a credit account with the bank.
- **Instructors (3)**: publish course packages (text/audio/video/MCQ), receive lump-sum credits upon upload, withdraw earnings from verified transaction records.
- **Learners**: register/login, set up credit-bank profile (account + secret), browse 5 courses, purchase courses, access unlocked materials, and receive completion certificates.
- **Credit Bank**: lightweight credit ledger with virtual accounts, limits, and transaction validation (no real currency).

## Service Modules
1. **Auth & Profile**: Mock login for learners/instructors. Learners configure bank credentials on first homescreen visit.
2. **Course Catalogue**: Read-only view of 5 seeded courses with instructor metadata + hero imagery.
3. **Enrollment & Payments**:
   - Learner initiates purchase ⇒ server calculates credits due ⇒ generates bank transaction request.
   - Bank verifies secret, available credit, and issues transaction record.
   - LMS debits learner credits, credits LMS account, stores transaction.
   - Instructor validates record to release payout & unlocks course for learner.
4. **Materials Access**: Once enrollment active, learners can stream video/audio, read text, take MCQs.
5. **Certification**: After completion flag, LMS issues certificate (UUID + timestamp) per learner/course.
6. **Instructor Uploads**: Instructors can POST a new course (auto-limits to 5 by replacing oldest) and immediately receive lump-sum credit.
7. **Bank Module**: REST endpoints to:
   - create/update account secrets
   - check balances/credits
   - post debit/credit transactions within the LMS ecosystem

## REST Endpoints
| Method | Route | Description |
| -- | -- | -- |
| GET | `/api/courses` | List catalog + availability |
| GET | `/api/courses/:id` | Detailed course content |
| POST | `/api/learners/:id/bank` | Set or update bank account + secret |
| POST | `/api/learners/:id/enroll` | Purchase course, trigger bank debit |
| POST | `/api/learners/:id/complete` | Mark completion + issue certificate |
| GET | `/api/learners/:id` | Profile with enrollments, certificates, balances |
| POST | `/api/instructors/:id/courses` | Upload new course materials, pay lump sum |
| POST | `/api/instructors/:id/transactions/:txnId/validate` | Approve payout and release learner access |
| GET | `/api/instructors/:id` | Instructor dashboard data |
| GET | `/api/bank/accounts/:accountNumber` | Credit balance & usage |
| POST | `/api/bank/transaction` | Generic credit transfer requests |

## Frontend Experience
- Built with **React + Vite** and **Tailwind** for rapid styling.
- Global aesthetic: deep twilight gradients, glassmorphism cards, floating aurora particles.
- Animated dashboard flows via **Framer Motion** and **Lottie** icons.
- Distinct spaces for Learners, Instructors, and Bank widgets with neon accent palette.
- Rich course cards (hero image overlays, price tags, instructor chips) and interactive purchase modals.
- Timeline visual to show transaction progression (bank request → LMS settlement → instructor validation → certificate).

## Credit Bank Model
- Accounts store `credits`, `creditLimit`, `creditUsed`, and `secret`.
- Transactions ensure `credits - creditUsed >= amount` for debits, and clamp payouts to maintain integrity.
- All payouts and enrollments happen inside the sandbox; no real currency integration required.

## Sequence (Learner Purchase)
1. Learner logs in → sets bank account + secret.
2. Learner selects course → POST `/enroll` with courseId, secret.
3. Server validates course, verifies bank credentials, debits learner, credits LMS, records transaction.
4. Instructor later validates record → credits instructor, unlocks course for learner.
5. Learner accesses materials; upon completion triggers `/complete` to mint certificate.

This blueprint ensures every requirement (5-course limit, instructor payouts, learner purchasing, bank interactions, certificate issuance, and balance checks) is explicitly represented in both backend and UI layers.
