import { useEffect, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { Button } from "../../../shared";
import {
  fetchAssessmentAttempts,
  gradeAssessmentAttempt,
} from "../../../../../../api/trainer/assessmentService";
import { AssessmentFields } from "../CreateAssessment/CreateAssessment";
import "../AssessmentDialog/AssessmentDialog.css";
import "./ViewAssessment.css";

const ATTEMPTS_PAGE_SIZE = 10;

function formatAttemptedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ViewAssessment({ assessment, onClose }) {
  const assessmentId = assessment.assessment_id ?? assessment.id;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [attempts, setAttempts] = useState([]);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [savingAttemptId, setSavingAttemptId] = useState("");
  const [gradeErrors, setGradeErrors] = useState({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalRecords: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchAssessmentAttempts({
      assessmentId,
      page,
      limit: ATTEMPTS_PAGE_SIZE,
      search: debouncedSearch,
    })
      .then((data) => {
        if (!active) return;
        setAttempts(data.attempts ?? []);
        setGradeDrafts(
          Object.fromEntries(
            (data.attempts ?? []).map((attempt) => [
              attempt.ca_record_id,
              {
                candidate_marks:
                  attempt.candidate_marks == null
                    ? ""
                    : String(attempt.candidate_marks),
                assessment_grade: attempt.assessment_grade ?? "",
              },
            ]),
          ),
        );
        setPagination(data.pagination ?? {});
      })
      .catch((requestError) => {
        if (!active) return;
        setAttempts([]);
        setError(
          requestError.response?.data?.message ||
            "Unable to load assessment attempts.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [assessmentId, page, debouncedSearch]);

  const updateGradeDraft = (recordId, field, value) => {
    setGradeDrafts((current) => ({
      ...current,
      [recordId]: { ...current[recordId], [field]: value },
    }));
    setGradeErrors((current) => {
      if (!current[recordId]) return current;
      const next = { ...current };
      delete next[recordId];
      return next;
    });
  };

  const saveGrade = async (attempt) => {
    const draft = gradeDrafts[attempt.ca_record_id] ?? {};
    const body = {};
    const originalMarks =
      attempt.candidate_marks == null ? "" : String(attempt.candidate_marks);
    const originalGrade = attempt.assessment_grade ?? "";
    const marksChanged = draft.candidate_marks !== originalMarks;
    const gradeChanged = draft.assessment_grade !== originalGrade;

    if (marksChanged && draft.candidate_marks !== "") {
      const marks = Number(draft.candidate_marks);
      if (!Number.isInteger(marks) || marks < 0 || marks > 999) {
        setGradeErrors((current) => ({
          ...current,
          [attempt.ca_record_id]: "Marks must be a whole number from 0 to 999.",
        }));
        return;
      }
      body.candidateMarks = marks;
    }
    if (gradeChanged && draft.assessment_grade) {
      if (!["A", "B", "C", "D", "F"].includes(draft.assessment_grade)) {
        setGradeErrors((current) => ({
          ...current,
          [attempt.ca_record_id]: "Select a valid grade.",
        }));
        return;
      }
      body.assessmentGrade = draft.assessment_grade;
    }
    if (!Object.keys(body).length) {
      setGradeErrors((current) => ({
        ...current,
        [attempt.ca_record_id]: "Change marks or grade before saving.",
      }));
      return;
    }

    setSavingAttemptId(attempt.ca_record_id);
    setGradeErrors((current) => {
      const next = { ...current };
      delete next[attempt.ca_record_id];
      return next;
    });
    try {
      const updated = await gradeAssessmentAttempt({
        assessmentId,
        caRecordId: attempt.ca_record_id,
        ...body,
      });
      setAttempts((current) =>
        current.map((item) =>
          item.ca_record_id === attempt.ca_record_id
            ? { ...item, ...updated }
            : item,
        ),
      );
      setGradeDrafts((current) => ({
        ...current,
        [attempt.ca_record_id]: {
          candidate_marks:
            updated.candidate_marks == null
              ? ""
              : String(updated.candidate_marks),
          assessment_grade: updated.assessment_grade ?? "",
        },
      }));
    } catch (requestError) {
      setGradeErrors((current) => ({
        ...current,
        [attempt.ca_record_id]:
          requestError.response?.data?.message ||
          "Unable to save this candidate's grade.",
      }));
    } finally {
      setSavingAttemptId("");
    }
  };

  return (
    <div
      className="assessment-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="View assessment and attempts"
    >
      <div className="assessment-dialog assessment-attempts-dialog">
        <div className="assessment-dialog-header">
          <div>
            <p>Trainer resources</p>
            <h2>Assessment details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assessment details"
          >
            <X size={18} />
          </button>
        </div>
        <AssessmentFields form={assessment} setForm={() => {}} readOnly />
        <section className="assessment-attempts">
          <div className="assessment-attempts-heading">
            <div>
              <h3>Candidate attempts</h3>
              <p>
                An attempt is recorded when a candidate opens the assessment
                link; it does not confirm exam completion.
              </p>
            </div>
            <span>{pagination.totalRecords ?? 0} candidates</span>
          </div>
          <label className="assessment-attempts-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search candidate name or unique ID"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          {error && (
            <p className="assessment-attempts-error" role="alert">
              {error}
            </p>
          )}
          <div className="assessment-attempts-table-wrap">
            <table className="assessment-attempts-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Unique ID</th>
                  <th>Attempted at</th>
                  <th>Marks</th>
                  <th>Grade</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6">Loading attempts...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6">Attempts could not be loaded.</td>
                  </tr>
                ) : attempts.length === 0 ? (
                  <tr>
                    <td colSpan="6">No candidate attempts found.</td>
                  </tr>
                ) : (
                  attempts.map((attempt) => (
                    <tr key={attempt.ca_record_id}>
                      <td>{attempt.candidate_name || "-"}</td>
                      <td>{attempt.candidate_unique_id || "-"}</td>
                      <td>{formatAttemptedAt(attempt.attempted_at)}</td>
                      <td>
                        <input
                          aria-label={`Marks for ${attempt.candidate_name}`}
                          className="assessment-grade-input"
                          type="number"
                          min="0"
                          max="999"
                          step="1"
                          value={
                            gradeDrafts[attempt.ca_record_id]
                              ?.candidate_marks ?? ""
                          }
                          onChange={(event) =>
                            updateGradeDraft(
                              attempt.ca_record_id,
                              "candidate_marks",
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <select
                          aria-label={`Grade for ${attempt.candidate_name}`}
                          className="assessment-grade-input"
                          value={
                            gradeDrafts[attempt.ca_record_id]
                              ?.assessment_grade ?? ""
                          }
                          onChange={(event) =>
                            updateGradeDraft(
                              attempt.ca_record_id,
                              "assessment_grade",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Select grade</option>
                          {["A", "B", "C", "D", "F"].map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <Button
                          variant="primary"
                          disabled={savingAttemptId === attempt.ca_record_id}
                          onClick={() => saveGrade(attempt)}
                        >
                          {savingAttemptId === attempt.ca_record_id
                            ? "Saving..."
                            : "Save"}
                        </Button>
                        {gradeErrors[attempt.ca_record_id] && (
                          <span
                            className="assessment-grade-row-error"
                            role="alert"
                          >
                            {gradeErrors[attempt.ca_record_id]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="assessment-attempts-pagination">
            <span>
              Page {pagination.currentPage ?? page} of{" "}
              {Math.max(pagination.totalPages ?? 1, 1)}
            </span>
            <div>
              <Button
                variant="outline"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={
                  loading || page >= Math.max(pagination.totalPages ?? 1, 1)
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(current + 1, pagination.totalPages ?? 1),
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        </section>
        <div className="assessment-dialog-actions">
          {assessment.assessment_link && (
            <a
              className="assessment-link-button"
              href={assessment.assessment_link}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} /> Open assessment link
            </a>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
