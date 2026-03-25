class Logger {
  logs: any[];

  constructor() {
    this.logs = [];
  }

  add(entry: any) {
    this.logs.push(entry);
  }

  download() {
    if (this.logs.length === 0) {
      alert("No logs recorded yet. Click Start Log, simulate movement, then try again.");
      return;
    }
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "navigation_logs.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    this.logs = []; // clear after download for next run
  }
}

export default new Logger();
