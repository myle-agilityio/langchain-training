// A2UI Catalog — React Renderers: each renderer maps a component name from
// definitions.ts to a React implementation, registered via <CopilotKit a2ui={...}>.

import React from "react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { createCatalog } from "@copilotkit/a2ui-renderer";
import type { CatalogRenderers } from "@copilotkit/a2ui-renderer";
import { demonstrationCatalogDefinitions } from "./definitions";
import type { DemonstrationCatalogDefinitions } from "./definitions";
import { colors } from "./theme";
import { ActionButton } from "./ActionButton";

// "children" template entries are strings or { id, basePath } once GenericBinder resolves a
// STRUCTURAL binding — richer than definitions.ts's pre-resolution Zod shape, and not yet
// reflected in @copilotkit/a2ui-renderer's published RendererProps.children type either.
type ChildEntry = string | { id: string; basePath?: string };
type ChildrenWithBasePath = (id: string, basePath?: string) => React.ReactNode;

// ─── Renderers (type-checked against schema definitions) ────────────

const demonstrationCatalogRenderers: CatalogRenderers<DemonstrationCatalogDefinitions> =
  {
    Title: ({ props }) => {
      const Tag = (
        props.level === "h1" ? "h1" : props.level === "h3" ? "h3" : "h2"
      ) as keyof React.JSX.IntrinsicElements;
      const sizes: Record<string, string> = {
        h1: "1.75rem",
        h2: "1.25rem",
        h3: "1rem",
      };

      return (
        <Tag
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: sizes[props.level ?? "h2"],
            color: colors.cardFg,
            letterSpacing: "-0.01em",
          }}
        >
          {props.text}
        </Tag>
      );
    },

    // Text: removed — use the basic catalog's Text (supports DynamicStringSchema
    // for path bindings in fixed-schema templates).

    Row: ({ props, children }) => {
      const justifyMap: Record<string, string> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
        spaceBetween: "space-between",
      };
      const items = (
        Array.isArray(props.children) ? props.children : []
      ) as ChildEntry[];

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: `${props.gap ?? 16}px`,
            alignItems: props.align ?? "stretch",
            justifyContent:
              justifyMap[props.justify ?? "start"] ?? "flex-start",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {items.map((item, i) => {
            if (typeof item === "string") {
              return (
                <div
                  key={`${item}-${i}`}
                  style={{ flex: "1 1 0", minWidth: 0 }}
                >
                  {children(item)}
                </div>
              );
            }

            if (item && typeof item === "object" && "id" in item) {
              return (
                <div
                  key={`${item.id}-${i}`}
                  style={{ flex: "1 1 0", minWidth: 0 }}
                >
                  {(children as ChildrenWithBasePath)(item.id, item.basePath)}
                </div>
              );
            }

            return null;
          })}
        </div>
      );
    },

    Column: ({ props, children }) => {
      const items = (
        Array.isArray(props.children) ? props.children : []
      ) as ChildEntry[];

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${props.gap ?? 12}px`,
            width: "100%",
          }}
        >
          {items.map((item, i) => {
            if (typeof item === "string") {
              return (
                <React.Fragment key={`${item}-${i}`}>
                  {children(item)}
                </React.Fragment>
              );
            }

            if (item && typeof item === "object" && "id" in item) {
              return (
                <React.Fragment key={`${item.id}-${i}`}>
                  {(children as ChildrenWithBasePath)(item.id, item.basePath)}
                </React.Fragment>
              );
            }

            return null;
          })}
        </div>
      );
    },

    DashboardCard: ({ props, children }) => (
      <div
        style={{
          background: colors.card,
          borderRadius: "12px",
          border: `1px solid ${colors.border}`,
          padding: "20px",
          boxShadow: colors.shadow,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              color: colors.cardFg,
            }}
          >
            {props.title}
          </div>
          {props.subtitle && (
            <div
              style={{
                fontSize: "0.75rem",
                color: colors.muted,
                marginTop: "2px",
              }}
            >
              {props.subtitle}
            </div>
          )}
        </div>
        {props.child && children(props.child)}
      </div>
    ),

    Metric: ({ props }) => {
      const trendColors: Record<string, string> = {
        up: "#059669",
        down: "#dc2626",
        neutral: colors.muted,
      };
      const trendIcons: Record<string, string> = {
        up: "↑",
        down: "↓",
        neutral: "→",
      };

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: colors.muted,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {props.label}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: colors.cardFg,
                letterSpacing: "-0.02em",
              }}
            >
              {props.value}
            </span>
            {props.trend && props.trendValue && (
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: trendColors[props.trend] ?? colors.muted,
                }}
              >
                {trendIcons[props.trend]} {props.trendValue}
              </span>
            )}
          </div>
        </div>
      );
    },

    PieChart: ({ props }) => {
      const COLORS = [
        "#3b82f6",
        "#8b5cf6",
        "#ec4899",
        "#f59e0b",
        "#10b981",
        "#6366f1",
      ];
      const data = props.data ?? [];

      return (
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <RechartsPie>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={props.innerRadius ?? 40}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color ?? COLORS[i % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      );
    },

    BarChart: ({ props }) => {
      const data = props.data ?? [];

      return (
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <RechartsBar data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.divider} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: colors.muted }}
              />
              <YAxis tick={{ fontSize: 11, fill: colors.muted }} />
              <Tooltip />
              <Bar
                dataKey="value"
                fill={props.color ?? "#3b82f6"}
                radius={[4, 4, 0, 0]}
              />
            </RechartsBar>
          </ResponsiveContainer>
        </div>
      );
    },

    Badge: ({ props }) => {
      const variants: Record<string, { bg: string; color: string }> = {
        success: { bg: "#dcfce7", color: "#166534" },
        warning: { bg: "#fef3c7", color: "#92400e" },
        error: { bg: "#fee2e2", color: "#991b1b" },
        info: { bg: "#dbeafe", color: "#1e40af" },
        neutral: { bg: "var(--muted)", color: colors.cardFg },
      };
      const v = variants[props.variant ?? "neutral"] ?? variants.neutral;

      return (
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 500,
            background: v.bg,
            color: v.color,
          }}
        >
          {props.text}
        </span>
      );
    },

    DataTable: ({ props }) => {
      const cols = props.columns ?? [];
      const rows = props.rows ?? [];

      return (
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
            }}
          >
            <thead>
              <tr>
                {cols.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.muted,
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: `1px solid ${colors.divider}` }}
                >
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      style={{ padding: "8px 12px", color: colors.cardFg }}
                    >
                      {String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },

    Button: ({ props, children }) => {
      return (
        <ActionButton label="Click" doneLabel="Done" action={props.action}>
          {props.child ? children(props.child) : null}
        </ActionButton>
      );
    },
  };

// ─── Assembled Catalog ───────────────────────────────────────────────

export const demonstrationCatalog = createCatalog(
  demonstrationCatalogDefinitions,
  demonstrationCatalogRenderers,
  {
    catalogId: "copilotkit://app-dashboard-catalog",
  },
);
