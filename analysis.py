import pandas as pd
import matplotlib.pyplot as plt

# -----------------------
# LOAD DATA
# -----------------------

fisheries = pd.read_csv("data/fisheries.csv", header=1)

# Clean column names
fisheries.columns = fisheries.columns.str.strip()

# Temperature
temperature = pd.read_csv("data/fisheries.csv")

# Remove whitespace from column names
temperature.columns = temperature.columns.str.strip()

# -----------------------
# CLEAN FISHERIES DATA
# -----------------------

# Print columns to confirm
print("Fisheries Columns:", fisheries.columns)

# Keep only needed columns
required_fish_cols = ["Year", "State", "Pounds", "Dollars"]

# Check available columns
for col in required_fish_cols:
    if col not in fisheries.columns:
        print(f"Warning: {col} not found in fisheries data")

fisheries = fisheries[required_fish_cols]

# Convert Year and Pounds to numeric
fisheries["Year"] = pd.to_numeric(fisheries["Year"], errors="coerce")
fisheries["Pounds"] = pd.to_numeric(fisheries["Pounds"], errors="coerce")

# Remove missing values
fisheries = fisheries.dropna()

# Aggregate total pounds per year
fish_yearly = fisheries.groupby("Year")["Pounds"].sum().reset_index()

print("\nFish Yearly Summary:")
print(fish_yearly.head())

# -----------------------
# CLEAN TEMPERATURE DATA
# -----------------------

print("\nTemperature Columns:", temperature.columns)

# Ensure TAVG exists
if "TAVG" not in temperature.columns:
    print("ERROR: TAVG column not found. Please confirm temperature dataset selection.")
    exit()

temperature = temperature[["DATE", "TAVG"]]

# Convert DATE to datetime
temperature["DATE"] = pd.to_datetime(temperature["DATE"], errors="coerce")

# Extract Year
temperature["Year"] = temperature["DATE"].dt.year

# Convert TAVG to numeric
temperature["TAVG"] = pd.to_numeric(temperature["TAVG"], errors="coerce")

# Remove missing values
temperature = temperature.dropna()

# Aggregate annual average temperature
temp_yearly = temperature.groupby("Year")["TAVG"].mean().reset_index()

print("\nTemperature Yearly Summary:")
print(temp_yearly.head())

# -----------------------
# PLOT FISHERIES TREND
# -----------------------

plt.figure()
plt.plot(fish_yearly["Year"], fish_yearly["Pounds"])
plt.title("Total Fisheries Landings Over Time")
plt.xlabel("Year")
plt.ylabel("Total Pounds")
plt.show()

# -----------------------
# PLOT TEMPERATURE TREND
# -----------------------

plt.figure()
plt.plot(temp_yearly["Year"], temp_yearly["TAVG"])
plt.title("Average Annual Temperature Trend")
plt.xlabel("Year")
plt.ylabel("Average Temperature")
plt.show()
