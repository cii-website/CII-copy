import api from "../api";
import { fetchPaginatedPage } from "./paginationService";

export async function fetchMyBatches() {
  const response = await api.get("/instructor/my-batches");
  return response.data.data.batches ?? [];
}

export async function fetchAssessments({
  page = 1,
  limit = 15,
  search,
  batchId,
} = {}) {
  const params = { limit };
  if (search?.trim()) params.search = search.trim();
  if (batchId) params.batch_id = batchId;

  return fetchPaginatedPage({
    fetchPage: async (requestPage) => {
      const response = await api.get("/instructor/assessment/get-assessment", {
        params: { ...params, page: requestPage },
      });
      return response.data.data;
    },
    page,
    limit,
    itemsKey: "assessments",
  });
}

export async function fetchAssessmentAttempts({
  assessmentId,
  page = 1,
  limit = 10,
  search,
}) {
  const response = await api.get(
    `/instructor/assessments/${assessmentId}/attempts`,
    {
      params: {
        page,
        limit,
        ...(search?.trim() ? { search: search.trim() } : {}),
      },
    },
  );
  return response.data.data;
}

export async function gradeAssessmentAttempt({
  assessmentId,
  caRecordId,
  candidateMarks,
  assessmentGrade,
}) {
  const body = {};
  if (candidateMarks !== undefined) body.candidate_marks = candidateMarks;
  if (assessmentGrade !== undefined) body.assessment_grade = assessmentGrade;

  const response = await api.patch(
    `/instructor/assessments/${assessmentId}/attempts/${caRecordId}/grade`,
    body,
  );
  return response.data.data;
}

export async function createAssessment({
  batchId,
  title,
  assessmentDesc,
  assessmentType,
  assessmentDate,
  questions,
  assessmentDuration,
  assessmentLink,
}) {
  const response = await api.post("/instructor/assessment/create-assessment", {
    batch_id: batchId,
    title,
    assessment_desc: assessmentDesc,
    assessment_type: assessmentType,
    assessment_date: assessmentDate,
    questions,
    assessment_duration: assessmentDuration,
    assessment_link: assessmentLink || null,
  });

  return response.data.data;
}

export async function updateAssessment({
  assessmentId,
  title,
  assessmentDesc,
  assessmentDate,
  assessmentDuration,
  assessmentLink,
  assessmentType,
  questions,
  isShow,
}) {
  const response = await api.patch("/instructor/assessment/update-assessment", {
    assessment_id: assessmentId,
    title,
    assessment_desc: assessmentDesc,
    assessment_date: assessmentDate,
    assessment_duration: assessmentDuration,
    assessment_link: assessmentLink || null,
    assessment_type: assessmentType,
    questions,
    is_show: isShow,
  });

  return response.data.data;
}

export function mapAssessmentRecord(item) {
  return {
    id: item.assessment_id,
    assessment_id: item.assessment_id,
    batch_id: item.batch_details?.batch_id ?? "",
    batch_code: item.batch_details?.batch_code ?? "-",
    course: item.batch_details?.course_details?.course_name ?? "-",
    title: item.title ?? "-",
    assessment_desc: item.assessment_desc ?? "",
    assessment_type: item.assessment_type ?? "-",
    assessment_date: item.assessment_date
      ? item.assessment_date.slice(0, 10)
      : "",
    assessment_date_display: item.assessment_date
      ? new Date(item.assessment_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-",
    questions: item.questions ?? 0,
    no_of_questions: item.questions ?? 0,
    assessment_duration: item.assessment_duration ?? 0,
    assessment_link: item.assessment_link ?? "",
    is_show: item.is_show,
  };
}
