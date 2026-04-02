from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import oracledb
from datetime import datetime, timedelta

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    dsn = oracledb.makedsn("localhost", 1521, sid="XE")
    return oracledb.connect(user="system", password="password", dsn=dsn)

def to_int(x):
    try: return int(x)
    except: return 0

def to_float(x):
    try: return float(x)
    except: return 0.0

def to_date(x):
    try: return str(x).split(".")[0] if x else ""
    except: return ""

def is_fk_error(e: Exception) -> bool:
    msg = str(e).upper()
    return "ORA-02292" in msg or "ORA-02291" in msg or "INTEGRITY CONSTRAINT" in msg

def run_query(sql, params=None, commit=False):
    db = None
    cur = None
    try:
        db = get_db()
        cur = db.cursor()
        if params:
            cur.execute(sql, params)
        else:
            cur.execute(sql)
        if commit:
            db.commit()
        try:
            return cur.fetchall()
        except Exception:
            return []
    except Exception as e:
        print("DB ERROR:", e)
        if commit and db:
            try: db.rollback()
            except: pass
        raise e
    finally:
        if cur:
            try: cur.close()
            except: pass
        if db:
            try: db.close()
            except: pass

def next_id(table: str, id_col: str) -> int:
    rows = run_query(f"SELECT NVL(MAX({id_col}), 0) + 1 FROM {table}")
    try: return int(rows[0][0])
    except: return 1

def safe_delete(sql, params, entity_label: str):
    try:
        run_query(sql, params, True)
        return {"msg": "deleted"}
    except Exception as e:
        if is_fk_error(e):
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete this {entity_label} because other records depend on it. Delete those first."
            )
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# CLIENTS
# Columns: CLIENTID, CLIENTNAME, EMAIL, PHONE, CREATEDDATE
# =========================
@app.get("/clients")
def get_clients():
    rows = run_query("SELECT CLIENTID,CLIENTNAME,EMAIL,PHONE,CREATEDDATE FROM CLIENT_24BDS1045")
    return [{"clientId": to_int(r[0]), "clientName": r[1] or "", "email": r[2] or "",
             "phone": r[3] or "", "createdDate": to_date(r[4])} for r in rows]

@app.post("/clients")
def create_client(c: dict):
    new_id = next_id("CLIENT_24BDS1045", "CLIENTID")
    try:
        run_query(
            "INSERT INTO CLIENT_24BDS1045(CLIENTID,CLIENTNAME,EMAIL,PHONE,CREATEDDATE) VALUES (:1,:2,:3,:4,TO_DATE(:5,'YYYY-MM-DD'))",
            [new_id, c["clientName"], c["email"], c["phone"], c["createdDate"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "clientId": new_id}

@app.put("/clients/{id}")
def update_client(id: int, c: dict):
    try:
        run_query(
            "UPDATE CLIENT_24BDS1045 SET CLIENTNAME=:1,EMAIL=:2,PHONE=:3 WHERE CLIENTID=:4",
            [c["clientName"], c["email"], c["phone"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/clients/{id}")
def delete_client(id: int):
    return safe_delete("DELETE FROM CLIENT_24BDS1045 WHERE CLIENTID=:1", [id], "client")

# =========================
# FREELANCERS
# Columns: FREELANCERID, FREELANCERNAME, EMAIL, PHONE, EXPERIENCEYEARS
# =========================
@app.get("/freelancers")
def get_freelancers():
    rows = run_query("SELECT FREELANCERID,FREELANCERNAME,EMAIL,PHONE,EXPERIENCEYEARS FROM FREELANCER_24BDS1045")
    return [{"freelancerId": to_int(r[0]), "freelancerName": r[1] or "", "email": r[2] or "",
             "phone": r[3] or "", "experienceYears": to_int(r[4])} for r in rows]

@app.post("/freelancers")
def create_freelancer(f: dict):
    new_id = next_id("FREELANCER_24BDS1045", "FREELANCERID")
    try:
        run_query(
            "INSERT INTO FREELANCER_24BDS1045(FREELANCERID,FREELANCERNAME,EMAIL,PHONE,EXPERIENCEYEARS) VALUES (:1,:2,:3,:4,:5)",
            [new_id, f["freelancerName"], f["email"], f["phone"], f["experienceYears"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "freelancerId": new_id}

@app.put("/freelancers/{id}")
def update_freelancer(id: int, f: dict):
    try:
        run_query(
            "UPDATE FREELANCER_24BDS1045 SET FREELANCERNAME=:1,EMAIL=:2,PHONE=:3,EXPERIENCEYEARS=:4 WHERE FREELANCERID=:5",
            [f["freelancerName"], f["email"], f["phone"], f["experienceYears"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/freelancers/{id}")
def delete_freelancer(id: int):
    return safe_delete("DELETE FROM FREELANCER_24BDS1045 WHERE FREELANCERID=:1", [id], "freelancer")

# =========================
# PROJECTS
# Columns: PROJECTID, CLIENTID, PROJECTTITLE, PROJECTDESCRIPTION, BUDGET, DEADLINE, STATUS
# =========================
@app.get("/projects")
def get_projects():
    rows = run_query("SELECT PROJECTID,CLIENTID,PROJECTTITLE,PROJECTDESCRIPTION,BUDGET,DEADLINE,STATUS FROM PROJECT_24BDS1045")
    return [{"projectId": to_int(r[0]), "clientId": to_int(r[1]), "projectTitle": r[2] or "",
             "description": r[3] or "", "budget": to_float(r[4]),
             "deadline": to_date(r[5]), "status": r[6] or ""} for r in rows]

@app.post("/projects")
def create_project(p: dict):
    new_id = next_id("PROJECT_24BDS1045", "PROJECTID")
    try:
        run_query(
            "INSERT INTO PROJECT_24BDS1045(PROJECTID,CLIENTID,PROJECTTITLE,PROJECTDESCRIPTION,BUDGET,DEADLINE,STATUS) VALUES (:1,:2,:3,:4,:5,TO_DATE(:6,'YYYY-MM-DD'),:7)",
            [new_id, p["clientId"], p["projectTitle"], p["description"],
             p["budget"], p["deadline"], p["status"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "projectId": new_id}

@app.put("/projects/{id}")
def update_project(id: int, p: dict):
    try:
        run_query(
            "UPDATE PROJECT_24BDS1045 SET PROJECTTITLE=:1,PROJECTDESCRIPTION=:2,BUDGET=:3,DEADLINE=TO_DATE(:4,'YYYY-MM-DD'),STATUS=:5 WHERE PROJECTID=:6",
            [p["projectTitle"], p["description"], p["budget"], p["deadline"], p["status"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/projects/{id}")
def delete_project(id: int):
    return safe_delete("DELETE FROM PROJECT_24BDS1045 WHERE PROJECTID=:1", [id], "project")

# =========================
# PROPOSALS
# Columns: PROPOSALID, PROJECTID, FREELANCERID, PROPOSEDAMOUNT, PROPOSEDDURATION, PROPOSALDATE, STATUS
# =========================
@app.get("/proposals")
def get_proposals():
    rows = run_query("SELECT PROPOSALID,PROJECTID,FREELANCERID,PROPOSEDAMOUNT,PROPOSEDDURATION,PROPOSALDATE,STATUS FROM PROPOSAL_24BDS1045")
    return [{"proposalId": to_int(r[0]), "projectId": to_int(r[1]), "freelancerId": to_int(r[2]),
             "proposedAmount": to_float(r[3]), "proposedDuration": to_int(r[4]),
             "proposalDate": to_date(r[5]), "status": r[6] or ""} for r in rows]

@app.post("/proposals")
def create_proposal(p: dict):
    new_id = next_id("PROPOSAL_24BDS1045", "PROPOSALID")
    try:
        run_query(
            "INSERT INTO PROPOSAL_24BDS1045(PROPOSALID,PROJECTID,FREELANCERID,PROPOSEDAMOUNT,PROPOSEDDURATION,PROPOSALDATE,STATUS) VALUES (:1,:2,:3,:4,:5,TO_DATE(:6,'YYYY-MM-DD'),:7)",
            [new_id, p["projectId"], p["freelancerId"], p["proposedAmount"],
             p["proposedDuration"], p["proposalDate"], p.get("status", "Pending")], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "proposalId": new_id}

@app.put("/proposals/{id}")
def update_proposal(id: int, p: dict):
    try:
        run_query("UPDATE PROPOSAL_24BDS1045 SET STATUS=:1 WHERE PROPOSALID=:2",
                  [p["status"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/proposals/{id}")
def delete_proposal(id: int):
    return safe_delete("DELETE FROM PROPOSAL_24BDS1045 WHERE PROPOSALID=:1", [id], "proposal")

# =========================
# ACCEPT / REJECT PROPOSAL
# =========================
@app.post("/proposals/{id}/accept")
def accept_proposal(id: int):
    db = None
    cur = None
    try:
        db = get_db()
        cur = db.cursor()

        cur.execute("SELECT PROJECTID,FREELANCERID,PROPOSEDDURATION FROM PROPOSAL_24BDS1045 WHERE PROPOSALID=:1", [id])
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Proposal not found")

        projectId, freelancerId, duration = row
        duration_days = int(duration) if duration else 0
        start_date = datetime.today()
        end_date = start_date + timedelta(days=duration_days)
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")

        cur.execute("UPDATE PROPOSAL_24BDS1045 SET STATUS='Accepted' WHERE PROPOSALID=:1", [id])
        cur.execute("UPDATE PROPOSAL_24BDS1045 SET STATUS='Rejected' WHERE PROJECTID=:1 AND PROPOSALID!=:2", [projectId, id])
        cur.execute("UPDATE PROJECT_24BDS1045 SET STATUS='In Progress' WHERE PROJECTID=:1", [projectId])

        cur.execute("SELECT NVL(MAX(CONTRACTID),0)+1 FROM CONTRACT_24BDS1045")
        new_contract_id = cur.fetchone()[0]

        cur.execute(
            "INSERT INTO CONTRACT_24BDS1045(CONTRACTID,PROJECTID,FREELANCERID,STARTDATE,ENDDATE,CONTRACTSTATUS) VALUES (:1,:2,:3,TO_DATE(:4,'YYYY-MM-DD'),TO_DATE(:5,'YYYY-MM-DD'),'Active')",
            [new_contract_id, projectId, freelancerId, start_str, end_str])

        db.commit()
        return {"msg": "accepted", "contractId": new_contract_id, "startDate": start_str, "endDate": end_str}

    except HTTPException:
        raise
    except Exception as e:
        print("ACCEPT ERROR:", e)
        if db:
            try: db.rollback()
            except: pass
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            try: cur.close()
            except: pass
        if db:
            try: db.close()
            except: pass

@app.post("/proposals/{id}/reject")
def reject_proposal(id: int):
    try:
        run_query("UPDATE PROPOSAL_24BDS1045 SET STATUS='Rejected' WHERE PROPOSALID=:1", [id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "rejected"}

# =========================
# CONTRACTS
# Columns: CONTRACTID, PROJECTID, FREELANCERID, STARTDATE, ENDDATE, CONTRACTSTATUS
# =========================
@app.get("/contracts")
def get_contracts():
    rows = run_query("SELECT CONTRACTID,PROJECTID,FREELANCERID,STARTDATE,ENDDATE,CONTRACTSTATUS FROM CONTRACT_24BDS1045")
    return [{"contractId": to_int(r[0]), "projectId": to_int(r[1]), "freelancerId": to_int(r[2]),
             "startDate": to_date(r[3]), "endDate": to_date(r[4]), "contractStatus": r[5] or ""} for r in rows]

@app.post("/contracts")
def create_contract(c: dict):
    new_id = next_id("CONTRACT_24BDS1045", "CONTRACTID")
    try:
        run_query(
            "INSERT INTO CONTRACT_24BDS1045(CONTRACTID,PROJECTID,FREELANCERID,STARTDATE,ENDDATE,CONTRACTSTATUS) VALUES (:1,:2,:3,TO_DATE(:4,'YYYY-MM-DD'),TO_DATE(:5,'YYYY-MM-DD'),:6)",
            [new_id, c["projectId"], c["freelancerId"], c.get("startDate"), c.get("endDate"), c["contractStatus"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "contractId": new_id}

@app.put("/contracts/{id}")
def update_contract(id: int, c: dict):
    try:
        run_query(
            "UPDATE CONTRACT_24BDS1045 SET ENDDATE=TO_DATE(:1,'YYYY-MM-DD'),CONTRACTSTATUS=:2 WHERE CONTRACTID=:3",
            [c.get("endDate"), c["contractStatus"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/contracts/{id}")
def delete_contract(id: int):
    return safe_delete("DELETE FROM CONTRACT_24BDS1045 WHERE CONTRACTID=:1", [id], "contract")

# =========================
# MILESTONES
# Columns: MILESTONEID, CONTRACTID, MILESTONETITLE, DUEDATE, AMOUNT, MILESTONESTATUS
# =========================
@app.get("/milestones")
def get_milestones():
    rows = run_query("SELECT MILESTONEID,CONTRACTID,MILESTONETITLE,DUEDATE,AMOUNT,MILESTONESTATUS FROM MILESTONE_24BDS1045")
    return [{"milestoneId": to_int(r[0]), "contractId": to_int(r[1]), "title": r[2] or "",
             "dueDate": to_date(r[3]), "amount": to_float(r[4]), "status": r[5] or ""} for r in rows]

def check_milestone_budget(contract_id: int, new_amount: float, exclude_milestone_id: int = None):
    """Raises HTTP 400 if adding new_amount would exceed the project budget."""
    # Get project budget via contract
    rows = run_query("""
        SELECT p.BUDGET, NVL(SUM(ms.AMOUNT), 0)
        FROM PROJECT_24BDS1045 p
        JOIN CONTRACT_24BDS1045 c ON c.PROJECTID = p.PROJECTID
        LEFT JOIN MILESTONE_24BDS1045 ms ON ms.CONTRACTID = c.CONTRACTID
            AND (:1 IS NULL OR ms.MILESTONEID != :2)
        WHERE c.CONTRACTID = :3
        GROUP BY p.BUDGET
    """, [exclude_milestone_id, exclude_milestone_id, contract_id])

    if not rows:
        return  # contract not found, let DB handle it
    budget = to_float(rows[0][0])
    existing_total = to_float(rows[0][1])
    if existing_total + new_amount > budget:
        remaining = budget - existing_total
        raise HTTPException(
            status_code=400,
            detail=f"Milestone amount exceeds project budget. Budget remaining: {remaining:.2f} (Budget: {budget:.2f}, Already allocated: {existing_total:.2f})"
        )

@app.post("/milestones")
def create_milestone(m: dict):
    new_id = next_id("MILESTONE_24BDS1045", "MILESTONEID")
    try:
        check_milestone_budget(int(m["contractId"]), float(m["amount"]))
        run_query(
            "INSERT INTO MILESTONE_24BDS1045(MILESTONEID,CONTRACTID,MILESTONETITLE,DUEDATE,AMOUNT,MILESTONESTATUS) VALUES (:1,:2,:3,TO_DATE(:4,'YYYY-MM-DD'),:5,:6)",
            [new_id, m["contractId"], m["title"], m["dueDate"], m["amount"], m["status"]], True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "milestoneId": new_id}

@app.put("/milestones/{id}")
def update_milestone(id: int, m: dict):
    try:
        check_milestone_budget(int(m["contractId"]), float(m["amount"]), exclude_milestone_id=id)
        run_query(
            "UPDATE MILESTONE_24BDS1045 SET MILESTONETITLE=:1,DUEDATE=TO_DATE(:2,'YYYY-MM-DD'),AMOUNT=:3,MILESTONESTATUS=:4 WHERE MILESTONEID=:5",
            [m["title"], m["dueDate"], m["amount"], m["status"], id], True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/milestones/{id}")
def delete_milestone(id: int):
    return safe_delete("DELETE FROM MILESTONE_24BDS1045 WHERE MILESTONEID=:1", [id], "milestone")

@app.post("/milestones/{id}/complete")
def complete_milestone(id: int, body: dict):
    """
    Marks milestone Completed, auto-creates a Pending payment request,
    and auto-completes the contract if all its milestones are now done.
    """
    db = None
    cur = None
    try:
        db = get_db()
        cur = db.cursor()
        contract_id = body.get("contractId")
        amount = body.get("amount", 0)

        # 1. Mark milestone as Completed
        cur.execute(
            "UPDATE MILESTONE_24BDS1045 SET MILESTONESTATUS='Completed' WHERE MILESTONEID=:1",
            [id]
        )

        # 2. Create a Pending payment request if one doesn't already exist
        cur.execute("SELECT COUNT(*) FROM PAYMENT_24BDS1045 WHERE MILESTONEID=:1", [id])
        already_exists = cur.fetchone()[0] > 0
        if not already_exists:
            cur.execute("SELECT NVL(MAX(PAYMENTID),0)+1 FROM PAYMENT_24BDS1045")
            new_payment_id = cur.fetchone()[0]
            cur.execute(
                """INSERT INTO PAYMENT_24BDS1045(PAYMENTID,MILESTONEID,PAYMENTDATE,AMOUNTPAID,PAYMENTMETHOD,PAYMENTSTATUS)
                   VALUES (:1,:2,SYSDATE,:3,'Bank Transfer','Pending')""",
                [new_payment_id, id, amount]
            )

        # 3. Check if all milestones on this contract are now Completed
        if contract_id:
            cur.execute(
                """SELECT COUNT(*) FROM MILESTONE_24BDS1045
                   WHERE CONTRACTID=:1 AND MILESTONESTATUS != 'Completed'""",
                [contract_id]
            )
            remaining = cur.fetchone()[0]
            if remaining == 0:
                # Auto-complete the contract
                cur.execute(
                    "UPDATE CONTRACT_24BDS1045 SET CONTRACTSTATUS='Completed' WHERE CONTRACTID=:1",
                    [contract_id]
                )
                # Auto-complete the project linked to this contract
                cur.execute(
                    """UPDATE PROJECT_24BDS1045 SET STATUS='Completed'
                       WHERE PROJECTID = (SELECT PROJECTID FROM CONTRACT_24BDS1045 WHERE CONTRACTID=:1)""",
                    [contract_id]
                )

        db.commit()
        return {"msg": "completed", "paymentCreated": not already_exists}

    except Exception as e:
        print("COMPLETE MILESTONE ERROR:", e)
        if db:
            try: db.rollback()
            except: pass
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cur:
            try: cur.close()
            except: pass
        if db:
            try: db.close()
            except: pass

# =========================
# PAYMENTS
# Columns: PAYMENTID, MILESTONEID, PAYMENTDATE, AMOUNTPAID, PAYMENTMETHOD, PAYMENTSTATUS
# =========================
@app.get("/payments")
def get_payments():
    rows = run_query("SELECT PAYMENTID,MILESTONEID,PAYMENTDATE,AMOUNTPAID,PAYMENTMETHOD,PAYMENTSTATUS FROM PAYMENT_24BDS1045")
    return [{"paymentId": to_int(r[0]), "milestoneId": to_int(r[1]), "paymentDate": to_date(r[2]),
             "amount": to_float(r[3]), "method": r[4] or "", "status": r[5] or ""} for r in rows]

@app.post("/payments")
def create_payment(p: dict):
    new_id = next_id("PAYMENT_24BDS1045", "PAYMENTID")
    try:
        run_query(
            "INSERT INTO PAYMENT_24BDS1045(PAYMENTID,MILESTONEID,PAYMENTDATE,AMOUNTPAID,PAYMENTMETHOD,PAYMENTSTATUS) VALUES (:1,:2,TO_DATE(:3,'YYYY-MM-DD'),:4,:5,:6)",
            [new_id, p["milestoneId"], p.get("paymentDate"), p["amount"], p["method"], p["status"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "paymentId": new_id}

@app.put("/payments/{id}")
def update_payment(id: int, p: dict):
    try:
        run_query(
            "UPDATE PAYMENT_24BDS1045 SET PAYMENTMETHOD=:1,PAYMENTSTATUS=:2 WHERE PAYMENTID=:3",
            [p["method"], p["status"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/payments/{id}")
def delete_payment(id: int):
    return safe_delete("DELETE FROM PAYMENT_24BDS1045 WHERE PAYMENTID=:1", [id], "payment")

@app.post("/payments/{id}/pay")
def mark_payment_paid(id: int):
    try:
        run_query(
            "UPDATE PAYMENT_24BDS1045 SET PAYMENTSTATUS='Paid',PAYMENTDATE=SYSDATE WHERE PAYMENTID=:1",
            [id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "paid"}

# =========================
# REVIEWS
# Columns: REVIEWID, PROJECTID, FREELANCERID, RATING, COMMENTS, REVIEWDATE
# =========================
@app.get("/reviews")
def get_reviews():
    rows = run_query("SELECT REVIEWID,PROJECTID,FREELANCERID,RATING,COMMENTS,REVIEWDATE FROM REVIEW_24BDS1045")
    return [{"reviewId": to_int(r[0]), "projectId": to_int(r[1]), "freelancerId": to_int(r[2]),
             "rating": to_int(r[3]), "comment": r[4] or "", "reviewDate": to_date(r[5])} for r in rows]

@app.post("/reviews")
def create_review(r: dict):
    new_id = next_id("REVIEW_24BDS1045", "REVIEWID")
    try:
        run_query(
            "INSERT INTO REVIEW_24BDS1045(REVIEWID,PROJECTID,FREELANCERID,RATING,COMMENTS,REVIEWDATE) VALUES (:1,:2,:3,:4,:5,TO_DATE(:6,'YYYY-MM-DD'))",
            [new_id, r["projectId"], r["freelancerId"], r["rating"], r["comment"], r["reviewDate"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "reviewId": new_id}

@app.put("/reviews/{id}")
def update_review(id: int, r: dict):
    try:
        run_query(
            "UPDATE REVIEW_24BDS1045 SET RATING=:1,COMMENTS=:2 WHERE REVIEWID=:3",
            [r["rating"], r["comment"], id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/reviews/{id}")
def delete_review(id: int):
    return safe_delete("DELETE FROM REVIEW_24BDS1045 WHERE REVIEWID=:1", [id], "review")

# =========================
# DISPUTES
# Columns: DISPUTEID, CONTRACTID, DISPUTEREASON, DISPUTEDATE, DISPUTESTATUS, RESOLUTIONDETAILS
# =========================
@app.get("/disputes")
def get_disputes():
    rows = run_query("SELECT DISPUTEID,CONTRACTID,DISPUTEREASON,DISPUTEDATE,DISPUTESTATUS,RESOLUTIONDETAILS FROM DISPUTE_24BDS1045")
    return [{"disputeId": to_int(r[0]), "contractId": to_int(r[1]), "reason": r[2] or "",
             "disputeDate": to_date(r[3]), "status": r[4] or "", "resolution": r[5] or ""} for r in rows]

@app.post("/disputes")
def create_dispute(d: dict):
    new_id = next_id("DISPUTE_24BDS1045", "DISPUTEID")
    try:
        run_query(
            "INSERT INTO DISPUTE_24BDS1045(DISPUTEID,CONTRACTID,DISPUTEREASON,DISPUTEDATE,DISPUTESTATUS,RESOLUTIONDETAILS) VALUES (:1,:2,:3,TO_DATE(:4,'YYYY-MM-DD'),:5,:6)",
            [new_id, d["contractId"], d["reason"], d["disputeDate"], d["status"], d.get("resolution", "")], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created", "disputeId": new_id}

@app.put("/disputes/{id}")
def update_dispute(id: int, d: dict):
    try:
        run_query(
            "UPDATE DISPUTE_24BDS1045 SET DISPUTESTATUS=:1,RESOLUTIONDETAILS=:2 WHERE DISPUTEID=:3",
            [d["status"], d.get("resolution", ""), id], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "updated"}

@app.delete("/disputes/{id}")
def delete_dispute(id: int):
    return safe_delete("DELETE FROM DISPUTE_24BDS1045 WHERE DISPUTEID=:1", [id], "dispute")

# =========================
# SKILLS
# Columns: FREELANCERID, SKILL
# =========================
@app.get("/skills")
def get_skills():
    try:
        rows = run_query("SELECT FREELANCERID,SKILL FROM FREELANCERSKILL_24BDS1045")
        return [{"freelancerId": int(r[0]) if r[0] else 0, "skill": str(r[1]) if r[1] else ""} for r in rows]
    except:
        return []

@app.post("/skills")
def add_skill(s: dict):
    try:
        run_query("INSERT INTO FREELANCERSKILL_24BDS1045(FREELANCERID,SKILL) VALUES (:1,:2)",
                  [s["freelancerId"], s["skill"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "created"}

@app.post("/skills/delete")
def delete_skill(s: dict):
    try:
        run_query("DELETE FROM FREELANCERSKILL_24BDS1045 WHERE FREELANCERID=:1 AND SKILL=:2",
                  [s["freelancerId"], s["skill"]], True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"msg": "deleted"}

# =========================
# MASTER
# =========================
@app.get("/all")
def get_all():
    try:
        clients     = get_clients()     or []
        freelancers = get_freelancers() or []
        projects    = get_projects()    or []
        proposals   = get_proposals()   or []
        contracts   = get_contracts()   or []
        milestones  = get_milestones()  or []
        payments    = get_payments()    or []
        reviews     = get_reviews()     or []
        disputes    = get_disputes()    or []
        skills      = get_skills()      or []
        return {
            "clients": clients, "freelancers": freelancers, "projects": projects,
            "proposals": proposals, "contracts": contracts, "milestones": milestones,
            "payments": payments, "reviews": reviews, "disputes": disputes,
            "skills": skills, "freelancerSkills": skills,
        }
    except Exception as e:
        print("FATAL /all ERROR:", e)
        return {
            "clients": [], "freelancers": [], "projects": [], "proposals": [],
            "contracts": [], "milestones": [], "payments": [], "reviews": [],
            "disputes": [], "skills": [], "freelancerSkills": []
        }