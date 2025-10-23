
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header.tsx';
import ReportList from './components/ReportList.tsx';
import ReportDetail from './components/ReportDetail.tsx';
import ReportForm from './components/ReportForm.tsx';
import Dashboard from './components/Dashboard.tsx';
import ProblemLog from './components/ProblemLog.tsx';
import ProgressTrends from './components/ProgressTrends.tsx';
import DocumentLog from './components/DocumentLog.tsx';
import RestoreBackupModal from './components/RestoreBackupModal.tsx';
import ProjectManagerModal from './components/ProjectManagerModal.tsx';
import ResetAppModal from './components/ResetAppModal.tsx';
import { ProjectDailyReport, ProjectDocument, Project, AppData, ReportHistoryEntry, Theme } from './types.ts';
import { loadAppData, saveAppData } from './services/storageService.ts';
import { addFile, deleteFile, clearAllFiles } from './services/idbService.ts';
import { getNewReportTemplate } from './utils/reportUtils.ts';
import { loadTheme, saveTheme } from './services/themeService.ts';


type View = 'list' | 'detail' | 'form' | 'dashboard' | 'problemLog' | 'progressTrends' | 'documentLog';
type HeaderView = 'list' | 'dashboard' | 'problemLog' | 'progressTrends' | 'documentLog';

const App: React.FC = () => {
  const [appData, setAppData] = useState<AppData>(loadAppData());
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedReport, setSelectedReport] = useState<ProjectDailyReport | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme());
  
  // Modals state
  const [pendingBackup, setPendingBackup] = useState<AppData | null>(null);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isResetAppModalOpen, setIsResetAppModalOpen] = useState(false);
  
  useEffect(() => {
    saveAppData(appData);
  }, [appData]);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  const activeProject = useMemo(() => {
    return appData.projects.find(p => p.id === appData.activeProjectId) || null;
  }, [appData.projects, appData.activeProjectId]);

  const activeProjectReports = useMemo(() => {
    if (!activeProject) return [];
    return appData.reports
      .filter(r => r.projectId === activeProject.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [appData.reports, activeProject]);

  const activeProjectDocuments = useMemo(() => {
    if (!activeProject) return [];
    return appData.documents
      .filter(d => d.projectId === activeProject.id)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [appData.documents, activeProject]);
  
  // --- Project Management ---
  const handleSwitchProject = (projectId: string) => {
    if (appData.projects.some(p => p.id === projectId)) {
        setAppData(prev => ({...prev, activeProjectId: projectId}));
        setCurrentView('list');
    }
  };

  const handleCreateProject = (name: string) => {
    const newProject: Project = { id: `proj-${Date.now()}`, name };
    setAppData(prev => {
        const newProjects = [...prev.projects, newProject];
        return {
            ...prev,
            projects: newProjects,
            activeProjectId: newProject.id, // Switch to the new project
        };
    });
    setCurrentView('list');
  };

  const handleRenameProject = (id: string, newName: string) => {
    setAppData(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? {...p, name: newName} : p)
    }));
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("آیا از حذف این پروژه و تمام گزارش‌ها و اسناد مرتبط با آن مطمئن هستید؟ این عمل غیرقابل بازگشت است.")) return;

    try {
        const docsToDelete = appData.documents.filter(d => d.projectId === id);
        for(const doc of docsToDelete) {
            await deleteFile(doc.fileId);
        }

        setAppData(prev => {
            const newProjects = prev.projects.filter(p => p.id !== id);
            const newReports = prev.reports.filter(r => r.projectId !== id);
            const newDocuments = prev.documents.filter(d => d.projectId !== id);
            
            let newActiveProjectId = prev.activeProjectId;
            if (prev.activeProjectId === id) {
                newActiveProjectId = newProjects.length > 0 ? newProjects[0].id : null;
            }

            return {
                ...prev,
                projects: newProjects,
                reports: newReports,
                documents: newDocuments,
                activeProjectId: newActiveProjectId,
            };
        });
    } catch(error) {
        console.error("Failed to delete project files:", error);
        alert("خطا در حذف فایل‌های پروژه.");
    }
  };
  
  const handleResetApp = async () => {
    try {
        await clearAllFiles();
        setAppData({
            version: 2,
            projects: [],
            reports: [],
            documents: [],
            activeProjectId: null,
        });
        setIsResetAppModalOpen(false);
        setCurrentView('list');
        alert("تمام داده‌ها با موفقیت حذف شدند. برنامه ریست شد.");
    } catch (error) {
        console.error("Failed to clear data:", error);
        alert("خطا در پاک‌سازی داده‌ها.");
    }
  };


  // --- Report & Document Management ---
  const handleSelectReport = (report: ProjectDailyReport) => {
    setSelectedReport(report);
    setCurrentView('detail');
  };

  const handleCreateNew = () => {
    if (!activeProject) {
        alert("لطفا ابتدا یک پروژه ایجاد یا انتخاب کنید.");
        return;
    }
    const lastReport = activeProjectReports.length > 0 ? activeProjectReports[0] : undefined;
    setSelectedReport(getNewReportTemplate(activeProject, lastReport));
    setCurrentView('form');
  };
  
  const handleEdit = (report: ProjectDailyReport) => {
    setSelectedReport(report);
    setCurrentView('form');
  };
  
  const handleCreateOrEditForDate = (date: string) => {
    if (!activeProject) return;
    const existingReport = activeProjectReports.find(r => r.date === date);
    if (existingReport) {
        if (window.confirm(`گزارشی برای این روز (${date}) وجود دارد. آیا می‌خواهید آن را ویرایش کنید؟`)) {
            handleEdit(existingReport);
        }
    } else {
        if (window.confirm(`آیا می‌خواهید برای روز ${date} گزارش جدیدی ثبت کنید؟`)) {
            const lastReport = activeProjectReports.length > 0 ? activeProjectReports[0] : undefined;
            setSelectedReport(getNewReportTemplate(activeProject, lastReport, date));
            setCurrentView('form');
        }
    }
  };

  const handleSave = (reportToSave: ProjectDailyReport) => {
    setAppData(prev => {
        const oldReport = prev.reports.find(r => r.id === reportToSave.id);
        let updatedReport = { ...reportToSave };

        if (oldReport) { // This is an update
            const changes: string[] = [];
            // Compare simple fields
            if (oldReport.weather !== updatedReport.weather) changes.push(`- آب و هوا از '${oldReport.weather}' به '${updatedReport.weather}' تغییر کرد.`);
            if (oldReport.temperature !== updatedReport.temperature) changes.push(`- دما از '${oldReport.temperature}' به '${updatedReport.temperature}' تغییر کرد.`);
            if (oldReport.startTime !== updatedReport.startTime) changes.push(`- ساعت شروع تغییر کرد.`);
            if (oldReport.endTime !== updatedReport.endTime) changes.push(`- ساعت پایان تغییر کرد.`);
            if (oldReport.executivePersonnel !== updatedReport.executivePersonnel) changes.push(`- اسامی نفرات اجرایی به‌روز شد.`);
            if (oldReport.supervisorOpinion !== updatedReport.supervisorOpinion) changes.push(`- نظر دستگاه نظارت به‌روز شد.`);
            if (oldReport.clientOpinion !== updatedReport.clientOpinion) changes.push(`- نظر کارفرما به‌روز شد.`);

            // Compare array fields using JSON.stringify for a simple but effective check
            if (JSON.stringify(oldReport.performedActivities) !== JSON.stringify(updatedReport.performedActivities)) changes.push('- لیست فعالیت‌های انجام شده به‌روز شد.');
            if (JSON.stringify(oldReport.humanResources) !== JSON.stringify(updatedReport.humanResources)) changes.push('- لیست نیروی انسانی به‌روز شد.');
            if (JSON.stringify(oldReport.machinery) !== JSON.stringify(updatedReport.machinery)) changes.push('- لیست تجهیزات و ماشین‌آلات به‌روز شد.');
            if (JSON.stringify(oldReport.obstacles) !== JSON.stringify(updatedReport.obstacles)) changes.push('- لیست موانع و مشکلات به‌روز شد.');

            const details = changes.length > 0 ? changes.join('\n') : 'گزارش بدون تغییرات قابل توجهی ذخیره شد.';
            
            const historyEntry: ReportHistoryEntry = {
                id: `hist-${Date.now()}`,
                timestamp: new Date().toISOString(),
                user: 'کاربر', // Hardcoded user for now
                action: 'updated',
                details: details,
            };
            updatedReport.history = [historyEntry, ...(updatedReport.history || [])];

        } else { // This is a new report
            // Ensure history is initialized if the template somehow failed
            if (!updatedReport.history || updatedReport.history.length === 0) {
                 updatedReport.history = [{
                    id: `hist-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    user: 'کاربر',
                    action: 'created',
                    details: 'گزارش ایجاد شد.',
                }];
            }
        }
        
        const index = prev.reports.findIndex(r => r.id === updatedReport.id);
        let newReports;
        if (index > -1) {
          newReports = [...prev.reports];
          newReports[index] = updatedReport;
        } else {
          newReports = [updatedReport, ...prev.reports];
        }
        return {...prev, reports: newReports};
    });
    setSelectedReport(reportToSave); // Update the selected report to reflect history changes
    setCurrentView('detail');
  };

  const handleDelete = (id: string) => {
    setAppData(prev => ({...prev, reports: prev.reports.filter(r => r.id !== id)}));
    setCurrentView('list');
    setSelectedReport(null);
  };
  
  const handleAddDocument = async (file: File, description: string) => {
    if (!activeProject) return;
    const fileId = `file-${Date.now()}-${file.name}`;
    const newDocument: ProjectDocument = {
        id: `doc-${Date.now()}`,
        projectId: activeProject.id,
        fileId,
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
        description,
        uploadDate: new Date().toISOString()
    };
    try {
        await addFile(fileId, file);
        setAppData(prev => ({...prev, documents: [newDocument, ...prev.documents]}));
    } catch (error) {
        console.error("Failed to add document:", error);
        alert("خطا در ذخیره فایل.");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const docToDelete = appData.documents.find(d => d.id === docId);
    if (!docToDelete) return;
    try {
      await deleteFile(docToDelete.fileId);
      setAppData(prev => ({...prev, documents: prev.documents.filter(d => d.id !== docId)}));
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("خطا در حذف فایل.");
    }
  };
  
  const handleSolveObstacle = (
    reportId: string,
    obstacleId: string,
    resolutionDate: string,
    resolutionNotes: string
  ) => {
    let obstacleDescription = '';
    const reportWithObstacle = appData.reports.find(r => r.id === reportId);
    const obstacleToSolve = reportWithObstacle?.obstacles.find(o => o.id === obstacleId);
    if (!obstacleToSolve) return;
    obstacleDescription = obstacleToSolve.description;

    setAppData(prev => {
        const newReports = prev.reports.map(report => {
          const newObstacles = report.obstacles.map(obs => {
            if (obs.description === obstacleDescription && obs.status === 'open') {
              return { ...obs, status: 'closed' as const, resolutionDate, resolutionNotes };
            }
            return obs;
          });
          return { ...report, obstacles: newObstacles };
        });
        return {...prev, reports: newReports };
    });
  };

  // --- Backup & Restore ---
  const handlePromptRestore = (importedData: AppData) => {
    setPendingBackup(importedData);
  };
  
  const executeRestoreBackup = async () => {
    if (!pendingBackup) return;
    try {
        await clearAllFiles(); // Clear all files from IndexedDB
        setAppData(pendingBackup);
        alert(`بازیابی کامل شد.\nتمام داده‌های قبلی حذف و اطلاعات از فایل پشتیبان جایگزین شد.\n\nآمار داده‌های جدید:\n- ${pendingBackup.projects.length} پروژه\n- ${pendingBackup.reports.length} گزارش\n- ${pendingBackup.documents.length} سند`);
    } catch (error) {
        console.error("Failed to restore backup:", error);
        alert("خطا در فرآیند بازیابی پشتیبان.");
    } finally {
        setPendingBackup(null);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };
  
  // --- View Management ---
  const handleBack = () => {
    setCurrentView('list');
    setSelectedReport(null);
  };
  
  const handleViewChange = (view: HeaderView) => {
    setCurrentView(view);
    setSelectedReport(null);
  };
  
  const getHeaderView = (): HeaderView => {
    if (['dashboard', 'problemLog', 'progressTrends', 'documentLog'].includes(currentView)) {
        return currentView as HeaderView;
    }
    return 'list';
  }

  const renderContent = () => {
    if (!activeProject && appData.projects.length > 0) {
        // This state should ideally not happen if logic is correct, but as a fallback
        handleSwitchProject(appData.projects[0].id);
        return null;
    }
      
    if (!activeProject) {
        return (
            <div className="text-center py-16 px-6 bg-card border border-border rounded-lg shadow-xl">
                <h2 className="text-2xl font-bold text-card-foreground">خوش آمدید!</h2>
                <p className="mt-4 text-muted-foreground">هیچ پروژه‌ای وجود ندارد. برای شروع یک پروژه جدید ایجاد کنید.</p>
                <button 
                    onClick={() => setIsProjectManagerOpen(true)} 
                    className="mt-6 bg-primary hover:opacity-90 text-primary-foreground font-bold py-2 px-4 rounded-lg"
                >
                    ایجاد اولین پروژه
                </button>
            </div>
        );
    }

    switch (currentView) {
      case 'detail':
        return selectedReport && <ReportDetail report={selectedReport} onBack={handleBack} onEdit={handleEdit} onDelete={handleDelete} />;
      case 'form':
        const onCancelAction = appData.reports.some(r => r.id === selectedReport?.id) 
            ? () => setCurrentView('detail') 
            : handleBack;
        return selectedReport && <ReportForm report={selectedReport} onSave={handleSave} onCancel={onCancelAction} />;
      case 'dashboard':
        return <Dashboard reports={activeProjectReports} onBack={handleBack} />;
      case 'problemLog':
        return <ProblemLog reports={activeProjectReports} onSolveObstacle={handleSolveObstacle} />;
      case 'progressTrends':
        return <ProgressTrends reports={activeProjectReports} onBack={handleBack} />;
      case 'documentLog':
        return <DocumentLog documents={activeProjectDocuments} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} />;
      case 'list':
      default:
        return <ReportList 
                    reports={activeProjectReports} 
                    onSelectReport={handleSelectReport} 
                    onCreateNew={handleCreateNew} 
                    onCreateOrEditForDate={handleCreateOrEditForDate} 
                    onRestore={handlePromptRestore}
                    currentData={appData}
                />;
    }
  };

  return (
    <div className="text-foreground min-h-screen font-sans bg-background">
      <div className="no-print">
        <Header 
            currentView={getHeaderView()} 
            onViewChange={handleViewChange} 
            projects={appData.projects}
            activeProjectId={appData.activeProjectId}
            onSwitchProject={handleSwitchProject}
            onManageProjects={() => setIsProjectManagerOpen(true)}
            onResetApp={() => setIsResetAppModalOpen(true)}
            currentTheme={theme}
            onThemeChange={handleThemeChange}
        />
      </div>
      <main className="container mx-auto p-4 md:p-8">
        {renderContent()}
      </main>
      <footer className="text-center py-4 text-xs text-muted-foreground no-print">
        <p>Project Daily Report Analyzer v3.1.0 - Multi-Project & Theming</p>
      </footer>
      
      {/* Modals */}
      {pendingBackup && (
        <RestoreBackupModal
          onConfirm={executeRestoreBackup}
          onCancel={() => setPendingBackup(null)}
        />
      )}
      {isProjectManagerOpen && (
        <ProjectManagerModal
          projects={appData.projects}
          onCreate={handleCreateProject}
          onRename={handleRenameProject}
          onDelete={handleDeleteProject}
          onClose={() => setIsProjectManagerOpen(false)}
        />
      )}
      {isResetAppModalOpen && (
        <ResetAppModal
          onConfirm={handleResetApp}
          onCancel={() => setIsResetAppModalOpen(false)}
        />
      )}

    </div>
  );
};

export default App;