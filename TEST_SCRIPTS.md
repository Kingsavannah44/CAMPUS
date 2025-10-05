# Detailed Test Scripts for Full Integration Testing

## 1. Elections Management

### Test Case 1.1: Create Election - Valid Data

- Navigate to Admin page -> Elections tab
- Click "Create New Election"
- Fill in valid title, description, start date (future), end date (after start)
- Submit form
- Verify success message and new election appears in list

### Test Case 1.2: Create Election - Invalid Dates

- Repeat above but set start date in past or end date before start
- Verify validation error messages

### Test Case 1.3: Delete Election

- Select an existing election
- Click delete and confirm
- Verify election is removed and related positions, candidates, votes are deleted

---

## 2. Positions Management

### Test Case 2.1: Create Position - Valid Data

- Navigate to Positions subsection in Elections tab
- Click "Add Position"
- Enter valid title and select an election
- Submit form
- Verify success message and position appears in list

### Test Case 2.2: Create Position - Missing Election

- Attempt to create position without selecting election
- Verify validation error

### Test Case 2.3: Delete Position

- Delete an existing position
- Verify position and related candidates are removed

---

## 3. Candidates Management

### Test Case 3.1: Create Candidate - Valid Data

- Navigate to Candidates tab
- Click "Add Candidate"
- Fill in name, manifesto, select election and position
- Upload photo (optional)
- Submit form
- Verify success message and candidate appears in list

### Test Case 3.2: Create Candidate - Missing Required Fields

- Attempt to submit without required fields
- Verify validation errors

### Test Case 3.3: Delete Candidate

- Delete an existing candidate
- Verify candidate is removed

---

## 4. Votes and Analytics

### Test Case 4.1: View Votes Summary

- Navigate to Dashboard tab
- Verify total votes count and statistics

### Test Case 4.2: View Analytics

- Navigate to Analytics tab
- Verify election status breakdown and voting activity

---

## 5. Backend API Testing (using Postman or Curl)

- Test all CRUD endpoints for elections, positions, candidates, votes
- Validate error handling for invalid data and unauthorized access

---

Please confirm if you want me to assist with executing these tests or generating automated test scripts.
