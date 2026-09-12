import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { riskBand, riskScore } from "./riskBands";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  watermark: {
    fontSize: 14,
    fontWeight: 700,
    color: "#b91c1c",
    marginBottom: 10,
    textAlign: "center",
    border: "1pt solid #b91c1c",
    padding: 6,
  },
  watermarkReviewed: {
    fontSize: 11,
    color: "#166534",
    marginBottom: 10,
    textAlign: "center",
    border: "1pt solid #166534",
    padding: 6,
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, marginBottom: 10, color: "#374151" },
  banner: {
    fontSize: 9,
    backgroundColor: "#fef3c7",
    padding: 6,
    marginBottom: 4,
    border: "1pt solid #f59e0b",
  },
  table: { display: "flex", flexDirection: "column", marginTop: 10 },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #d1d5db" },
  headerRow: { flexDirection: "row", backgroundColor: "#1f2937" },
  cell: { padding: 4, borderRight: "0.5pt solid #d1d5db" },
  headerCell: {
    padding: 4,
    color: "#ffffff",
    fontWeight: 700,
    borderRight: "0.5pt solid #4b5563",
  },
  colHazard: { width: "22%" },
  colBefore: { width: "12%" },
  colControl: { width: "30%" },
  colAfter: { width: "12%" },
  colRef: { width: "24%" },
  footer: { marginTop: 16, fontSize: 8, color: "#6b7280" },
});

export interface PdfAssessment {
  project_type: string;
  activity: string;
  location_context: string | null;
  assessment_date: string;
  expected_conditions: string[];
  status: "draft" | "reviewed";
  reviewer_name: string | null;
  reviewer_role: string | null;
  reviewed_at: string | null;
  climate_flags: { ruleKey: string; message: string; legalReference: string }[];
}

export interface PdfRow {
  hazard: string;
  likelihood_before: number;
  severity_before: number;
  control_measures: string;
  likelihood_after: number;
  severity_after: number;
  regulatory_reference: string | null;
}

export function RiskAssessmentPdf({
  assessment,
  rows,
}: {
  assessment: PdfAssessment;
  rows: PdfRow[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {assessment.status === "reviewed" ? (
          <Text style={styles.watermarkReviewed}>
            REVIEWED - Signed off by {assessment.reviewer_name} (
            {assessment.reviewer_role}) on{" "}
            {assessment.reviewed_at
              ? new Date(assessment.reviewed_at).toLocaleDateString()
              : ""}
          </Text>
        ) : (
          <Text style={styles.watermark}>
            DRAFT - NOT YET REVIEWED - Requires sign-off by a certified HSE
            professional before site use
          </Text>
        )}

        <Text style={styles.title}>Construction Site Risk Assessment</Text>
        <Text style={styles.subtitle}>
          Project type: {assessment.project_type} | Activity:{" "}
          {assessment.activity} | Location: {assessment.location_context ?? "n/a"}{" "}
          | Date: {assessment.assessment_date} | Conditions:{" "}
          {assessment.expected_conditions.join(", ")}
        </Text>

        {assessment.climate_flags.map((flag) => (
          <Text key={flag.ruleKey} style={styles.banner}>
            {flag.message} (Ref: {flag.legalReference})
          </Text>
        ))}

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.colHazard]}>Hazard</Text>
            <Text style={[styles.headerCell, styles.colBefore]}>
              Risk Before (L x S)
            </Text>
            <Text style={[styles.headerCell, styles.colControl]}>
              Control Measures
            </Text>
            <Text style={[styles.headerCell, styles.colAfter]}>
              Risk After (L x S)
            </Text>
            <Text style={[styles.headerCell, styles.colRef]}>
              Regulatory Reference
            </Text>
          </View>
          {rows.map((row, i) => {
            const before = riskScore(row.likelihood_before, row.severity_before);
            const after = riskScore(row.likelihood_after, row.severity_after);
            return (
              <View style={styles.row} key={i}>
                <Text style={[styles.cell, styles.colHazard]}>{row.hazard}</Text>
                <Text style={[styles.cell, styles.colBefore]}>
                  {row.likelihood_before} x {row.severity_before} = {before} (
                  {riskBand(before)})
                </Text>
                <Text style={[styles.cell, styles.colControl]}>
                  {row.control_measures}
                </Text>
                <Text style={[styles.cell, styles.colAfter]}>
                  {row.likelihood_after} x {row.severity_after} = {after} (
                  {riskBand(after)})
                </Text>
                <Text style={[styles.cell, styles.colRef]}>
                  {row.regulatory_reference ?? "-"}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Generated with AI assistance, grounded in a curated reference
          library of Qatar Labour Law (Decree No. 14 of 2004) and QCS 2014
          health & safety provisions. This document is a draft aid and does
          not replace the judgment of a licensed Qatar HSE professional.
        </Text>
      </Page>
    </Document>
  );
}
