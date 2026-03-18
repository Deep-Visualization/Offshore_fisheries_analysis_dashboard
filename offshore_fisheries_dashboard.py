import streamlit as st
import pandas as pd
import plotly.express as px

# -------------------------------------------------
# PAGE CONFIG
# -------------------------------------------------
st.set_page_config(
    page_title="Offshore Fisheries Analytics",
    layout="wide"
)

# -------------------------------------------------
# CLEAN OCEAN CSS
# -------------------------------------------------
st.markdown("""
<style>
/* Animated Background */
.stApp {
    background: linear-gradient(-45deg, #caf0f8, #ade8f4, #90e0ef, #e0fbfc);
    background-size: 400% 400%;
    animation: gradientWave 15s ease infinite;
}
@keyframes gradientWave {
    0% {background-position: 0% 50%;}
    50% {background-position: 100% 50%;}
    100% {background-position: 0% 50%;}
}
/* Sidebar background */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #012a4a, #014f86, #2a6f97);
}
/* Sidebar headings + labels ONLY */
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3,
[data-testid="stSidebar"] label {
    color: white !important;
}
/* Sidebar buttons */
[data-testid="stSidebar"] button {
    width: 100%;
    border-radius: 8px;
    font-weight: 600;
}
/* KPI Cards */
.kpi-card {
    background: linear-gradient(135deg, #0077b6, #0096c7);
    padding: 25px;
    border-radius: 15px;
    text-align: center;
    color: white;
    font-size: 22px;
    font-weight: bold;
    box-shadow: 0px 6px 20px rgba(0,0,0,0.15);
    transition: transform 0.3s ease;
}
.kpi-card:hover { transform: scale(1.05); }
h1, h2, h3 { color: #023e8a; }
</style>
""", unsafe_allow_html=True)

# -------------------------------------------------
# HEADER
# -------------------------------------------------
st.markdown("""
<div style="text-align:center; padding:20px;">
    <h1>Offshore Fisheries Analytics Dashboard</h1>
    <p style="font-size:18px;">Exploring U.S. Commercial Fisheries Landings</p>
</div>
""", unsafe_allow_html=True)

# -------------------------------------------------
# LOAD DATA
# -------------------------------------------------
@st.cache_data
def load_data():
    # Read CSV without header
    df = pd.read_csv("data/fisheries.csv", header=None)

    # Assign proper column names (adjust according to your CSV structure)
    df.columns = [
        "Year", "State", "Species", "Pounds", "Dollars",
        "Other1", "Other2", "Other3", "Other4", "Other5", "Other6"
    ]

    # Strip spaces
    df.columns = df.columns.str.strip()

    # Convert numeric columns safely
    df["Pounds"] = pd.to_numeric(df["Pounds"], errors="coerce")
    df["Dollars"] = pd.to_numeric(df["Dollars"], errors="coerce")
    df["Year"] = pd.to_numeric(df["Year"], errors="coerce")

    # Drop rows missing required info
    df = df.dropna(subset=["Year", "State", "Pounds", "Dollars"])

    return df

df = load_data()

# -------------------------------------------------
# SIDEBAR
# -------------------------------------------------
st.sidebar.markdown("## Filters")

all_states = sorted(df["State"].unique())
if "selected_states" not in st.session_state:
    st.session_state.selected_states = all_states.copy()

# Quick Actions
st.sidebar.markdown("### Quick Actions")
if st.sidebar.button("Select All States"):
    st.session_state.selected_states = all_states.copy()
    st.rerun()
if st.sidebar.button("Clear All States"):
    st.session_state.selected_states = []
    st.rerun()

# Add State
st.sidebar.markdown("### Add State")
state_to_add = st.sidebar.selectbox(
    "", options=["Select a state..."] + all_states
)
if state_to_add != "Select a state...":
    if state_to_add not in st.session_state.selected_states:
        st.session_state.selected_states.append(state_to_add)
        st.rerun()

# Selected States List
st.sidebar.markdown(f"### Selected States ({len(st.session_state.selected_states)})")
for state in st.session_state.selected_states.copy():
    col1, col2 = st.sidebar.columns([5, 1])
    col1.markdown(f"✔ {state}")
    if col2.button("x", key=f"remove_{state}"):
        st.session_state.selected_states.remove(state)
        st.rerun()

selected_states = st.session_state.selected_states

# Metric selection
metric = st.sidebar.radio("Select Metric", ["Pounds", "Dollars"])

# Year slider
year_range = st.sidebar.slider(
    "Select Year Range",
    int(df["Year"].min()),
    int(df["Year"].max()),
    (int(df["Year"].min()), int(df["Year"].max()))
)

# -------------------------------------------------
# FILTER DATA
# -------------------------------------------------
filtered_df = df[
    (df["State"].isin(selected_states)) &
    (df["Year"] >= year_range[0]) &
    (df["Year"] <= year_range[1])
]

# -------------------------------------------------
# KPI SECTION
# -------------------------------------------------
total_value = filtered_df[metric].sum()
yearly = filtered_df.groupby("Year")[metric].sum()
max_year = yearly.max() if not yearly.empty else 0
min_year = yearly.min() if not yearly.empty else 0

col1, col2, col3 = st.columns(3)
with col1:
    st.markdown(f'<div class="kpi-card">Total {metric}<br>{total_value:,.0f}</div>', unsafe_allow_html=True)
with col2:
    st.markdown(f'<div class="kpi-card">Max Year Value<br>{max_year:,.0f}</div>', unsafe_allow_html=True)
with col3:
    st.markdown(f'<div class="kpi-card">Min Year Value<br>{min_year:,.0f}</div>', unsafe_allow_html=True)

st.markdown("---")

# -------------------------------------------------
# LINE CHART
# -------------------------------------------------
grouped = filtered_df.groupby("Year")[metric].sum().reset_index()
grouped["Millions"] = grouped[metric] / 1_000_000

fig_trend = px.line(
    grouped, x="Year", y="Millions", markers=True,
    color_discrete_sequence=["#0077b6"],
    title=f"{metric} Over Time (Millions)"
)
fig_trend.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)", hovermode="x unified")
st.plotly_chart(fig_trend, use_container_width=True)

# -------------------------------------------------
# BAR CHART
# -------------------------------------------------
state_grouped = (
    filtered_df.groupby("State")[metric]
    .sum().reset_index()
    .sort_values(by=metric, ascending=False)
    .head(10)
)
state_grouped["Millions"] = state_grouped[metric] / 1_000_000

fig_bar = px.bar(
    state_grouped, x="State", y="Millions",
    color="Millions", color_continuous_scale="Teal",
    title=f"Top 10 States by {metric}"
)
fig_bar.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
st.plotly_chart(fig_bar, use_container_width=True)

# -------------------------------------------------
# MAP
# -------------------------------------------------
state_abbrev = {
    "ALABAMA": "AL", "ALASKA": "AK", "CALIFORNIA": "CA",
    "FLORIDA-EAST": "FL", "FLORIDA-WEST": "FL",
    "GEORGIA": "GA", "LOUISIANA": "LA",
    "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MISSISSIPPI": "MS",
    "NEW YORK": "NY", "NORTH CAROLINA": "NC",
    "OREGON": "OR", "TEXAS": "TX",
    "VIRGINIA": "VA", "WASHINGTON": "WA"
}

map_df = state_grouped.copy()
map_df["Abbrev"] = map_df["State"].str.upper().map(state_abbrev)

fig_map = px.choropleth(
    map_df, locations="Abbrev", locationmode="USA-states",
    color="Millions", scope="usa", color_continuous_scale="Teal",
    title="Geographic Distribution"
)
fig_map.update_layout(plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)")
st.plotly_chart(fig_map, use_container_width=True)

# -------------------------------------------------
# DOWNLOAD
# -------------------------------------------------
st.download_button(
    label="Download Filtered Data",
    data=filtered_df.to_csv(index=False),
    file_name="filtered_fisheries_data.csv",
    mime="text/csv"
)