# -*- coding: utf-8 -*-
import streamlit as st
import streamlit.components.v1 as components
import os

# Set page to wide mode and hide sidebar by default
st.set_page_config(
    layout="wide", 
    page_title="FreshFetch AI Support",
    page_icon="🛒",
    initial_sidebar_state="collapsed"
)

# Fetch API Key from Streamlit Secrets
api_key = st.secrets.get("API_KEY", "")

# Custom CSS to remove Streamlit's default margins and UI elements
st.markdown("""
    <style>
        /* Hide Streamlit elements */
        #MainMenu {visibility: hidden;}
        header {visibility: hidden;}
        footer {visibility: hidden;}
        .stDeployButton {display:none;}
        
        /* Force the block container to fill the screen */
        .block-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            height: 100vh !important;
        }
        
        iframe {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            border: none;
        }
    </style>
""", unsafe_allow_html=True)

# Path to the React entry point
# In this environment, index.html is the orchestrator
if os.path.exists("index.html"):
    with open("index.html", "r", encoding="utf-8") as f:
        html_content = f.read()
        
    # Inject the API Key into the browser's global scope so the JS can find it
    # We inject it at the beginning of the <head> tag
    env_injection = f"""
    <script>
        window.process = {{
            env: {{
                API_KEY: "{api_key}"
            }}
        }};
    </script>
    """
    html_content = html_content.replace("<head>", f"<head>{env_injection}")
    
    # Render the application as a full-screen component
    components.html(html_content, height=1000)
else:
    st.error("Application files (index.html) not found. Please ensure all project files are uploaded.")
