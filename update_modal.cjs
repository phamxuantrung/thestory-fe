const fs = require('fs');
const file = 'src/pages/PetSanctuaryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                background: "var(--bg-main)",
                width: "100%",
                maxHeight: modal.type === "combatPlayback" ? "100vh" : "85vh",
                height: modal.type === "combatPlayback" ? "100vh" : "auto",
                borderTopLeftRadius: modal.type === "combatPlayback" ? 0 : "28px",
                borderTopRightRadius: modal.type === "combatPlayback" ? 0 : "28px",
                position: "relative", zIndex: 1, display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.1)"
              }}
            >
              {/* Drag handle */}
              {modal.type !== "combatPlayback" && (
                <div style={{ width: "40px", height: "5px", background: "rgba(0,0,0,0.1)", borderRadius: "3px", margin: "12px auto" }}></div>
              )}

              <div style={{ overflowY: "auto", padding: modal.type === "combatPlayback" ? 0 : "16px 20px 40px", flex: 1, display: modal.type === "combatPlayback" ? "flex" : "block", flexDirection: "column" }}>`;

const replacement = `            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                background: "var(--bg-main)",
                width: "100%",
                maxHeight: ["combatPlayback", "petDetail"].includes(modal.type) ? "100vh" : "85vh",
                height: ["combatPlayback", "petDetail"].includes(modal.type) ? "100vh" : "auto",
                borderTopLeftRadius: ["combatPlayback", "petDetail"].includes(modal.type) ? 0 : "28px",
                borderTopRightRadius: ["combatPlayback", "petDetail"].includes(modal.type) ? 0 : "28px",
                position: "relative", zIndex: 1, display: "flex", flexDirection: "column", boxShadow: "0 -4px 24px rgba(0,0,0,0.1)"
              }}
            >
              {/* Drag handle */}
              {!["combatPlayback", "petDetail"].includes(modal.type) && (
                <div style={{ width: "40px", height: "5px", background: "rgba(0,0,0,0.1)", borderRadius: "3px", margin: "12px auto" }}></div>
              )}

              <div style={{ overflowY: "auto", padding: ["combatPlayback", "petDetail"].includes(modal.type) ? (modal.type === "petDetail" ? "20px" : 0) : "16px 20px 40px", flex: 1, display: ["combatPlayback", "petDetail"].includes(modal.type) ? "flex" : "block", flexDirection: "column" }}>`;

if(content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log('Update successful!');
} else {
  console.log('Target not found!');
}
