"""
Homepage page: card-based journal of Highlight-tagged time entries
for the current week.
"""

import streamlit as st
from datetime import date, datetime, timedelta
import os

from src.theme import apply_theme
from src.data_store import get_connection, get_entries_df
from src.sync import sync_all, get_sync_status

apply_theme()

# ---------------------------------------------------------------------------
# Main content: Homepage -- This Week's Highlights
# ---------------------------------------------------------------------------

st.title("Homepage")

sync_status = get_sync_status()

if not sync_status["has_data"]:
    st.info(
        "**Getting started:**\n\n"
        "1. Copy `.env.example` to `.env`\n"
        "2. Paste your Toggl API token (from https://track.toggl.com/profile)\n"
        "3. Click **Full Sync** in the sidebar to download your history\n\n"
        "This will take about 1 minute for 8-9 years of data."
    )

    # Auto-sync: if the API token is configured but no data exists
    # (e.g. cold start on Streamlit Cloud), run a full sync automatically.
    token = os.getenv("TOGGL_API_TOKEN", "")
    if not token:
        try:
            token = st.secrets.get("TOGGL_API_TOKEN", "")
        except Exception:
            pass
    if token:
        st.subheader("Auto-syncing your data...")
        try:
            from src.toggl_client import TogglClient
            client = TogglClient()
            auto_bar = st.progress(0)
            auto_status = st.empty()

            def on_auto_progress(msg, frac):
                auto_status.text(msg)
                auto_bar.progress(min(frac, 1.0))

            import time
            result = sync_all(client, earliest_year=2017, progress_callback=on_auto_progress)
            st.success(
                f"Auto-sync complete! {result['total_entries']} entries across "
                f"{result['years_synced']} years."
            )
            time.sleep(1.5)
            st.rerun()
        except Exception as e:
            st.error(f"Auto-sync failed: {e}")
            st.caption("You can try again using the Full Sync button in the sidebar.")

    st.stop()

# ---------------------------------------------------------------------------
# Query: Highlight entries for the current ISO week
# ---------------------------------------------------------------------------

today = date.today()
iso_year, iso_week, _ = today.isocalendar()

# Compute the Monday-Sunday date range for this ISO week
monday = datetime.strptime(f"{iso_year}-W{iso_week:02d}-1", "%G-W%V-%u").date()
sunday = monday + timedelta(days=6)

conn = get_connection()
df = get_entries_df(conn, start_date=monday.isoformat(), end_date=sunday.isoformat())
conn.close()

# Filter to entries that carry the "Highlight" tag
if not df.empty and "tags_list" in df.columns:
    highlights = df[df["tags_list"].apply(lambda tags: "Highlight" in tags)].copy()
else:
    highlights = df.iloc[0:0]  # empty DataFrame with same columns

# ---------------------------------------------------------------------------
# Render: week header + card journal
# ---------------------------------------------------------------------------

st.markdown(
    f"### This Week's Highlights"
)
st.caption(
    f"Week {iso_week}  --  {monday.strftime('%b %d')} to {sunday.strftime('%b %d, %Y')}"
)

if highlights.empty:
    st.markdown("")
    st.info("No highlights logged this week yet.")
else:
    highlights = highlights.sort_values("start", ascending=True)

    PROJECT_COLORS = {
        "Prenatal": "#ff00ff",
        "Postnatal": "#ff00ff",
        "Work": "#bc13fe",
        "Home": "#00fff9",
        "Leisure": "#39ff14",
        "Health": "#ffd700",
        "Agentic": "#ff9800",
        "Intellect": "#00b4d8",
        "Asset": "#e040fb",
        "Kin": "#ff2079",
    }

    current_day = None
    for _, row in highlights.iterrows():
        try:
            start_dt = datetime.fromisoformat(str(row["start"]).replace("Z", "+00:00"))
            day_label = start_dt.strftime("%A, %b %d")
            time_label = start_dt.strftime("%H:%M")
            day_key = start_dt.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            day_label = str(row.get("start_date", ""))
            time_label = ""
            day_key = day_label

        if day_key != current_day:
            current_day = day_key
            st.markdown(f"#### {day_label}")

        description = row.get("description") or "(no description)"
        project = row.get("project_name") or ""
        hours = row.get("duration_hours", 0)
        dur_str = f"{hours:.1f}h" if hours >= 1 else f"{int(hours * 60)}m"

        accent = PROJECT_COLORS.get(project, "#00fff9")
        meta_parts = []
        if project:
            meta_parts.append(project)
        meta_parts.append(dur_str)
        if time_label:
            meta_parts.append(time_label)
        meta_line = "  \u00b7  ".join(meta_parts)

        st.markdown(
            f"""<div style="
                border-left: 3px solid {accent};
                padding: 12px 16px;
                margin-bottom: 8px;
                background: linear-gradient(135deg, #12122a 0%, #1a1a3e 100%);
                border-radius: 0 6px 6px 0;
                border-top: 1px solid #2a2a5a;
                border-right: 1px solid #2a2a5a;
                border-bottom: 1px solid #2a2a5a;
            ">
                <div style="color: #e0e0ff; font-size: 0.95rem; font-weight: 600; margin-bottom: 4px;">
                    {description}
                </div>
                <div style="color: #7878a8; font-size: 0.78rem; letter-spacing: 0.5px;">
                    {meta_line}
                </div>
            </div>""",
            unsafe_allow_html=True,
        )
