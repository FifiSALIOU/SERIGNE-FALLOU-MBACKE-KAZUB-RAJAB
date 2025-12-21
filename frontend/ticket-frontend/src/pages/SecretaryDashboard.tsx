import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelLeft, Clock3, Users, CheckCircle2, FileBarChart, ChevronRight, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface SecretaryDashboardProps {
  token: string;
}

interface Ticket {
  id: string;
  number: number;
  title: string;
  description?: string;
  creator_id: string;
  creator?: {
    full_name: string;
    email: string;
    agency: string | null;
  };
  user_agency: string | null;  // Agence de l'utilisateur créateur
  priority: string;
  status: string;
  type: string;  // "materiel" ou "applicatif"
  technician_id: string | null;
  secretary_id?: string | null;  // ID de l'adjoint DSI auquel le ticket est délégué
  created_at?: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  feedback_score?: number | null;
}

interface Technician {
  id: string;
  full_name: string;
  email: string;
  specialization?: string | null;
  assigned_tickets_count?: number;
  in_progress_tickets_count?: number;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  ticket_id?: string | null;
}

interface TicketHistory {
  id: string;
  ticket_id: string;
  old_status?: string | null;
  new_status: string;
  user_id: string;
  reason?: string | null;
  changed_at: string;
}

interface UserRead {
  id?: string;  // ID de l'utilisateur connecté
  full_name: string;
  email: string;
  agency?: string | null;
}

function SecretaryDashboard({ token }: SecretaryDashboardProps) {
  const [searchParams] = useSearchParams();
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [assignmentNotes, setAssignmentNotes] = useState<string>("");
  const [reopenTicketId, setReopenTicketId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [loadingRejectionReason, setLoadingRejectionReason] = useState<boolean>(false);
  const [viewTicketDetails, setViewTicketDetails] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<Ticket | null>(null);
  const [ticketHistory, setTicketHistory] = useState<TicketHistory[]>([]);
  const [showReopenModal, setShowReopenModal] = useState<boolean>(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignModalTicketId, setAssignModalTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleName, setRoleName] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [delegationFilter, setDelegationFilter] = useState<string>("all");
  const [showReportsDropdown, setShowReportsDropdown] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserRead | null>(null);
  const [showGenerateReport, setShowGenerateReport] = useState<boolean>(false);
  const [reportType, setReportType] = useState<string>("");
  const [reportPeriodFrom, setReportPeriodFrom] = useState<string>("2024-01-01");
  const [reportPeriodTo, setReportPeriodTo] = useState<string>("2024-01-31");
  const [reportFilters, setReportFilters] = useState({
    department: "all",
    technician: "all",
    ticketType: "all",
    priority: "all"
  });
  const [showOutputFormat, setShowOutputFormat] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openActionsMenuFor, setOpenActionsMenuFor] = useState<string | null>(null);

  // Fonction pour charger les rapports récents
  async function loadRecentReports() {
    if (!token || token.trim() === "") {
      return;
    }
    
    try {
      // Pour l'instant, on simule des rapports basés sur les tickets
      // Plus tard, on pourra appeler une vraie API /reports/recent
      const reports = [
        {
          id: "1",
          name: "Performance Janvier 2024",
          generated_by: userInfo?.full_name || "Admin",
          date: new Date().toLocaleDateString("fr-FR"),
          type: "performance"
        },
        {
          id: "2",
          name: "Tickets par Département",
          generated_by: "DSI",
          date: new Date(Date.now() - 86400000).toLocaleDateString("fr-FR"),
          type: "tickets_department"
        },
        {
          id: "3",
          name: "Satisfaction Utilisateurs",
          generated_by: userInfo?.full_name || "Admin",
          date: new Date(Date.now() - 172800000).toLocaleDateString("fr-FR"),
          type: "satisfaction"
        }
      ];
      setRecentReports(reports);
    } catch (err) {
      console.error("Erreur lors du chargement des rapports récents:", err);
    }
  }

  async function loadNotifications() {
    if (!token || token.trim() === "") {
      return;
    }
    
    try {
      const res = await fetch("http://localhost:8000/notifications/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des notifications:", err);
    }
  }

  async function loadUnreadCount() {
    if (!token || token.trim() === "") {
      return;
    }
    
    try {
      const res = await fetch("http://localhost:8000/notifications/unread/count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du nombre de notifications non lues:", err);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    if (!token || token.trim() === "") {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:8000/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await loadNotifications();
        await loadUnreadCount();
      }
    } catch (err) {
      console.error("Erreur lors du marquage de la notification comme lue:", err);
    }
  }
  
  async function clearAllNotifications() {
    const confirmed = window.confirm("Confirmer l'effacement de toutes les notifications ?");
    if (!confirmed) return;
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (token && token.trim() !== "" && unreadIds.length > 0) {
        await Promise.all(
          unreadIds.map((id) =>
            fetch(`http://localhost:8000/notifications/${id}/read`, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}` },
            })
          )
        );
      }
    } catch {}
    setNotifications([]);
    setUnreadCount(0);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    window.location.href = "/";
  }

  // Fonction pour charger les tickets (séparée pour pouvoir être appelée périodiquement)
  async function loadTickets() {
    if (!token || token.trim() === "") {
      return;
    }
    
    try {
      const ticketsRes = await fetch("http://localhost:8000/tickets/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setAllTickets(ticketsData);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des tickets:", err);
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        // Charger tous les tickets
        await loadTickets();

        // Charger la liste des techniciens
        const techRes = await fetch("http://localhost:8000/users/technicians", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (techRes.ok) {
          const techData = await techRes.json();
          setTechnicians(techData);
        }

        // Charger les informations de l'utilisateur connecté (pour connaître le rôle)
        const meRes = await fetch("http://localhost:8000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData && meData.role && typeof meData.role.name === "string") {
            setRoleName(meData.role.name);
          }
          setUserInfo({
            id: meData.id,
            full_name: meData.full_name,
            email: meData.email,
            agency: meData.agency
          });
        }

        // Charger les notifications
        await loadNotifications();
        await loadUnreadCount();
      } catch (err) {
        console.error("Erreur chargement données:", err);
      }
    }
    void loadData();

    // Recharger automatiquement les tickets et notifications toutes les 30 secondes
    // Cela permet aux métriques de se mettre à jour automatiquement avec les données réelles
    const interval = setInterval(() => {
      void loadTickets(); // Rafraîchir les tickets pour mettre à jour les métriques automatiquement
      void loadNotifications();
      void loadUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [token]);

  // Gérer les paramètres URL pour ouvrir automatiquement les modals
  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    const action = searchParams.get("action");
    
    if (ticketId && allTickets.length > 0) {
      // Vérifier que le ticket existe
      const ticket = allTickets.find(t => t.id === ticketId);
      if (ticket) {
        if (action === "assign") {
          setAssignModalTicketId(ticketId);
          setShowAssignModal(true);
          // Nettoyer l'URL après avoir ouvert le modal
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }
  }, [searchParams, allTickets]);

  // Charger les rapports récents quand userInfo est disponible
  useEffect(() => {
    if (userInfo) {
      loadRecentReports();
    }
  }, [userInfo]);

  // Debug: vérifier l'état de showGenerateReport
  useEffect(() => {
    if (showGenerateReport) {
      console.log("✅ showGenerateReport est maintenant TRUE - Le formulaire devrait s'afficher");
      console.log("showOutputFormat:", showOutputFormat);
    }
  }, [showGenerateReport, showOutputFormat]);

  // Fermer le menu des actions quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openActionsMenuFor) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-actions-menu]') && !target.closest('button[title="Actions"]')) {
          setOpenActionsMenuFor(null);
(null);
        }
      }
    };

    if (openActionsMenuFor) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openActionsMenuFor]);

  // Fonction pour filtrer les techniciens selon le type du ticket
  function getFilteredTechnicians(ticketType: string): Technician[] {
    if (!ticketType) return technicians;
    
    // Si le ticket est de type "materiel", afficher uniquement les techniciens matériel
    if (ticketType === "materiel") {
      return technicians.filter(tech => tech.specialization === "materiel");
    }
    
    // Si le ticket est de type "applicatif", afficher uniquement les techniciens applicatif
    if (ticketType === "applicatif") {
      return technicians.filter(tech => tech.specialization === "applicatif");
    }
    
    // Par défaut, retourner tous les techniciens
    return technicians;
  }

  const getMostFrequentProblems = () => {
    // Analyser les titres de tickets pour trouver des patterns récurrents significatifs
    // Utiliser les titres complets des tickets récurrents plutôt que des mots individuels
    const ticketGroups: { [key: string]: { title: string; count: number } } = {};
    
    allTickets.forEach(ticket => {
      if (ticket.title) {
        // Normaliser le titre pour grouper les tickets similaires
        const normalizedTitle = ticket.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();
        
        // Utiliser les premiers mots significatifs comme clé (3-5 mots)
        const words = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
        if (words.length >= 3) {
          // Prendre les 3-5 premiers mots significatifs
          const key = words.slice(0, Math.min(5, words.length)).join(' ');
          
          if (!ticketGroups[key]) {
            ticketGroups[key] = { title: ticket.title, count: 0 };
          }
          ticketGroups[key].count += 1;
        }
      }
    });

    // Filtrer pour ne garder que les patterns qui apparaissent au moins 2 fois
    // Retourner TOUS les problèmes (pas de limitation)
    return Object.values(ticketGroups)
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        problème: item.title,
        occurrences: item.count
      }));
  };

  const getRecurringTicketsHistory = () => {
    // Trouver les tickets avec des titres similaires (problèmes récurrents)
    const ticketGroups: { [key: string]: Ticket[] } = {};
    
    allTickets.forEach(ticket => {
      if (ticket.title) {
        // Normaliser le titre pour grouper les tickets similaires
        const normalizedTitle = ticket.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();
        
        // Utiliser les premiers mots comme clé de regroupement
        const key = normalizedTitle.split(/\s+/).slice(0, 3).join(' ');
        
        if (!ticketGroups[key]) {
          ticketGroups[key] = [];
        }
        ticketGroups[key].push(ticket);
      }
    });

    // Retourner TOUS les groupes avec plus d'un ticket (problèmes récurrents) - pas de limitation
    return Object.entries(ticketGroups)
      .filter(([_, tickets]) => tickets.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([_, tickets]) => ({
        titre: tickets[0].title,
        occurrences: tickets.length,
        dernier: tickets.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        })[0].created_at
      }));
  };

  const getProblematicApplications = () => {
    // Analyser les types de tickets et les titres pour identifier les applications/équipements problématiques
    const typeCounts: { [key: string]: number } = {};
    
    allTickets.forEach(ticket => {
      const type = ticket.type || 'autre';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        application: type === 'materiel' ? 'Matériel' : type === 'applicatif' ? 'Applicatif' : type.charAt(0).toUpperCase() + type.slice(1),
        tickets: count
      }));
  };

  // Fonction helper pour obtenir uniquement les tickets de l'agence de l'adjoint connecté (pour les exports uniquement)
  const getMyAgencyTicketsForExport = (): Ticket[] => {
    // Si pas d'agence définie, retourner tous les tickets (comportement par défaut pour l'affichage)
    if (!userInfo?.agency) {
      console.warn("⚠️ Aucune agence définie pour l'utilisateur connecté. Utilisation de toutes les données.");
      return allTickets;
    }
    
    const userAgency = String(userInfo.agency).trim();
    if (!userAgency) {
      console.warn("⚠️ Agence de l'utilisateur est vide. Utilisation de toutes les données.");
      return allTickets;
    }
    
    const filteredTickets = allTickets.filter(ticket => {
      const ticketAgency = String(ticket.creator?.agency || ticket.user_agency || "").trim();
      // Comparaison insensible à la casse et aux espaces
      const match = ticketAgency.toLowerCase() === userAgency.toLowerCase() && ticketAgency !== "";
      return match;
    });
    
    console.log(`📊 Filtrage par agence "${userAgency}": ${filteredTickets.length} ticket(s) trouvé(s) sur ${allTickets.length} total`);
    
    // Si aucun ticket trouvé, retourner tous les tickets pour éviter un export vide
    if (filteredTickets.length === 0) {
      console.warn("⚠️ Aucun ticket trouvé pour l'agence. Utilisation de toutes les données pour l'export.");
      return allTickets;
    }
    
    return filteredTickets;
  };

  // Fonctions filtrées pour les exports (uniquement pour l'adjoint)
  const getRecurringTicketsHistoryForExport = () => {
    const myTickets = getMyAgencyTicketsForExport();
    const ticketGroups: { [key: string]: Ticket[] } = {};
    
    myTickets.forEach(ticket => {
      if (ticket.title) {
        const normalizedTitle = ticket.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();
        const key = normalizedTitle.split(/\s+/).slice(0, 3).join(' ');
        
        if (!ticketGroups[key]) {
          ticketGroups[key] = [];
        }
        ticketGroups[key].push(ticket);
      }
    });

    return Object.entries(ticketGroups)
      .filter(([_, tickets]) => tickets.length > 1)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([_, tickets]) => ({
        titre: tickets[0].title,
        occurrences: tickets.length,
        dernier: tickets.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        })[0].created_at
      }));
  };

  const getMostFrequentProblemsForExport = () => {
    const myTickets = getMyAgencyTicketsForExport();
    const ticketGroups: { [key: string]: { title: string; count: number } } = {};
    
    myTickets.forEach(ticket => {
      if (ticket.title) {
        const normalizedTitle = ticket.title.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();
        const words = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
        if (words.length >= 3) {
          const key = words.slice(0, Math.min(5, words.length)).join(' ');
          
          if (!ticketGroups[key]) {
            ticketGroups[key] = { title: ticket.title, count: 0 };
          }
          ticketGroups[key].count += 1;
        }
      }
    });

    return Object.values(ticketGroups)
      .filter(item => item.count >= 2)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        problème: item.title,
        occurrences: item.count
      }));
  };

  const getProblematicApplicationsForExport = () => {
    const myTickets = getMyAgencyTicketsForExport();
    const typeCounts: { [key: string]: number } = {};
    
    myTickets.forEach(ticket => {
      const type = ticket.type || 'autre';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        application: type === 'materiel' ? 'Matériel' : type === 'applicatif' ? 'Applicatif' : type.charAt(0).toUpperCase() + type.slice(1),
        tickets: count
      }));
  };

  // Fonctions d'export pour les rapports
  const exportProblemsHistoryToPDF = (reportType: string = "Problèmes récurrents") => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Rapport: ${reportType}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Généré par: ${userInfo?.full_name || 'Utilisateur'}`, 14, 30);
      if (userInfo?.agency) {
        doc.text(`Agence: ${userInfo.agency}`, 14, 40);
      }
      
      // Utiliser les mêmes données que l'affichage (filtrées par agence si possible)
      const problems = getRecurringTicketsHistoryForExport();
      const mostFrequent = getMostFrequentProblemsForExport();
      const problematicApps = getProblematicApplicationsForExport();
      
      // Si aucune donnée filtrée, utiliser les données affichées (pour éviter un export vide)
      const problemsToUse = problems.length > 0 ? problems : getRecurringTicketsHistory();
      const mostFrequentToUse = mostFrequent.length > 0 ? mostFrequent : getMostFrequentProblems();
      const problematicAppsToUse = problematicApps.length > 0 ? problematicApps : getProblematicApplications();
      
      let startY = userInfo?.agency ? 50 : 40;
      
      if (problemsToUse.length > 0) {
        doc.setFontSize(14);
        doc.text("Historique des problèmes", 14, startY + 5);
        
        const tableData = problemsToUse.map(item => [
          item.titre || "",
          item.occurrences.toString(),
          item.dernier ? new Date(item.dernier).toLocaleDateString('fr-FR') : 'N/A'
        ]);
        
        autoTable(doc, {
          startY: startY + 10,
          head: [['Problème', 'Occurrences', 'Dernière occurrence']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95] },
        });
      }
      
      if (problemsToUse.length === 0 && mostFrequentToUse.length === 0 && problematicAppsToUse.length === 0) {
        doc.setFontSize(12);
        doc.text("Aucune donnée disponible.", 14, startY + 10);
      }
      
      if (mostFrequentToUse.length > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || startY + 10;
        doc.setFontSize(14);
        doc.text("Problèmes les plus fréquents", 14, finalY + 15);
        
        const tableData2 = mostFrequentToUse.map(item => [
          item.problème || "",
          item.occurrences.toString()
        ]);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Problème', 'Occurrences']],
          body: tableData2,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95] },
        });
      }
      
      if (problematicAppsToUse.length > 0) {
        const finalY = (doc as any).lastAutoTable?.finalY || startY + 10;
        doc.setFontSize(14);
        doc.text("Applications/équipements problématiques", 14, finalY + 15);
        
        const tableData3 = problematicAppsToUse.map(item => [
          item.application || "",
          item.tickets.toString()
        ]);
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Application/Équipement', 'Nombre de tickets']],
          body: tableData3,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95] },
        });
      }
      
      doc.save(`Rapport_${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      alert("Erreur lors de l'export PDF");
    }
  };

  // Fonction pour nettoyer les noms de feuilles Excel (caractères interdits: \ / ? * [ ])
  const sanitizeSheetName = (name: string): string => {
    // Excel limite les noms de feuilles à 31 caractères et interdit: \ / ? * [ ]
    return name
      .replace(/[\\/:?*[\]]/g, '-') // Remplacer les caractères interdits par des tirets
      .substring(0, 31); // Limiter à 31 caractères
  };

  const exportProblemsHistoryToExcel = (reportType: string = "Problèmes récurrents") => {
    try {
      // Utiliser les mêmes données que l'affichage (filtrées par agence si possible)
      const problems = getRecurringTicketsHistoryForExport();
      const mostFrequent = getMostFrequentProblemsForExport();
      const problematicApps = getProblematicApplicationsForExport();
      
      // Si aucune donnée filtrée, utiliser les données affichées (pour éviter un export vide)
      const problemsToUse = problems.length > 0 ? problems : getRecurringTicketsHistory();
      const mostFrequentToUse = mostFrequent.length > 0 ? mostFrequent : getMostFrequentProblems();
      const problematicAppsToUse = problematicApps.length > 0 ? problematicApps : getProblematicApplications();
      
      const wb = XLSX.utils.book_new();
      let hasSheets = false;
      
      // Feuille 1: Historique des problèmes
      if (problemsToUse.length > 0) {
        const wsData = [
          ['Problème', 'Occurrences', 'Dernière occurrence'],
          ...problemsToUse.map(item => [
            item.titre || "",
            item.occurrences,
            item.dernier ? new Date(item.dernier).toLocaleDateString('fr-FR') : 'N/A'
          ])
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName("Historique des problèmes"));
        hasSheets = true;
      }
      
      // Feuille 2: Problèmes les plus fréquents
      if (mostFrequentToUse.length > 0) {
        const wsData2 = [
          ['Problème', 'Occurrences'],
          ...mostFrequentToUse.map(item => [
            item.problème || "",
            item.occurrences
          ])
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(wsData2);
        XLSX.utils.book_append_sheet(wb, ws2, sanitizeSheetName("Problèmes fréquents"));
        hasSheets = true;
      }
      
      // Feuille 3: Applications/équipements problématiques
      if (problematicAppsToUse.length > 0) {
        const wsData3 = [
          ['Application/Équipement', 'Nombre de tickets'],
          ...problematicAppsToUse.map(item => [
            item.application || "",
            item.tickets
          ])
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(wsData3);
        XLSX.utils.book_append_sheet(wb, ws3, sanitizeSheetName("Applications-Équipements"));
        hasSheets = true;
      }
      
      // Si aucune feuille n'a été créée, créer une feuille par défaut
      if (!hasSheets) {
        const defaultData = [
          ['Rapport', reportType],
          ['Date de génération', new Date().toLocaleDateString('fr-FR')],
          ['Généré par', userInfo?.full_name || 'Utilisateur'],
          [''],
          ['Aucune donnée disponible.']
        ];
        const ws = XLSX.utils.aoa_to_sheet(defaultData);
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName("Rapport"));
      }
      
      // Générer le nom de fichier
      const fileName = `Rapport_${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Vérifier que le workbook n'est pas vide avant d'écrire
      if (wb.SheetNames.length === 0) {
        throw new Error("Le classeur Excel est vide");
      }
      
      // Essayer d'abord avec writeFile, puis avec une méthode alternative si nécessaire
      try {
        XLSX.writeFile(wb, fileName);
      } catch (writeError) {
        // Méthode alternative utilisant un blob
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Erreur lors de l'export Excel:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      alert(`Erreur lors de l'export Excel: ${errorMessage}`);
    }
  };

  // Fonction pour obtenir le nom du rapport
  const getReportName = (reportType?: string): string => {
    if (reportType) return reportType;
    const reportNames: { [key: string]: string } = {
      "statistiques": "Statistiques générales",
      "metriques": "Métriques de performance",
      "agence": "Analyses par agence",
      "technicien": "Analyses par technicien",
      "evolution": "Évolutions dans le temps",
      "recurrents": "Problèmes récurrents",
      "performance": "Rapports de Performance",
      "tickets": "Rapports Tickets"
    };
    return reportNames[selectedReport] || "Rapport";
  };

  // Fonction générique pour exporter en PDF selon le type de rapport
  const exportToPDF = (reportType?: string) => {
    const reportName = getReportName(reportType);
    try {
      if (selectedReport === "recurrents") {
        exportProblemsHistoryToPDF(reportName);
      } else {
        // Export générique pour les autres rapports
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Rapport: ${reportName}`, 14, 20);
        doc.setFontSize(12);
        doc.text(`Date de génération: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
        doc.text(`Généré par: ${userInfo?.full_name || 'Utilisateur'}`, 14, 40);
        doc.save(`Rapport_${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      alert("Erreur lors de l'export PDF");
    }
  };

  // Fonction générique pour exporter en Excel selon le type de rapport
  const exportToExcel = (reportType?: string) => {
    const reportName = getReportName(reportType);
    try {
      if (selectedReport === "recurrents") {
        exportProblemsHistoryToExcel(reportName);
      } else {
        // Export générique pour les autres rapports
        const wb = XLSX.utils.book_new();
        const wsData = [
          ['Rapport', reportName],
          ['Date de génération', new Date().toLocaleDateString('fr-FR')],
          ['Généré par', userInfo?.full_name || 'Utilisateur'],
          [''],
          ['Note: Les données détaillées seront disponibles dans une prochaine version.']
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName("Rapport"));
        
        // Vérifier que le workbook n'est pas vide avant d'écrire
        if (wb.SheetNames.length === 0) {
          throw new Error("Le classeur Excel est vide");
        }
        
        const fileName = `Rapport_${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Essayer d'abord avec writeFile, puis avec une méthode alternative si nécessaire
        try {
          XLSX.writeFile(wb, fileName);
        } catch (writeError) {
          // Méthode alternative utilisant un blob
          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          const blob = new Blob([wbout], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'export Excel:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      alert(`Erreur lors de l'export Excel: ${errorMessage}`);
    }
  };

  // Fonction générique pour voir le rapport détaillé
  const viewDetailedReport = (reportType?: string) => {
    const reportName = getReportName(reportType);
    if (selectedReport === "recurrents") {
      // Utiliser les mêmes données que l'affichage (filtrées par agence si possible)
      const problems = getRecurringTicketsHistoryForExport();
      const mostFrequent = getMostFrequentProblemsForExport();
      const problematicApps = getProblematicApplicationsForExport();
      
      // Si aucune donnée filtrée, utiliser les données affichées (pour éviter un rapport vide)
      const problemsToUse = problems.length > 0 ? problems : getRecurringTicketsHistory();
      const mostFrequentToUse = mostFrequent.length > 0 ? mostFrequent : getMostFrequentProblems();
      const problematicAppsToUse = problematicApps.length > 0 ? problematicApps : getProblematicApplications();
      
      let reportContent = `RAPPORT: ${reportName}\n`;
      reportContent += `Date de génération: ${new Date().toLocaleDateString('fr-FR')}\n`;
      reportContent += `Date de génération (heure): ${new Date().toLocaleTimeString('fr-FR')}\n\n`;
      
      reportContent += "=".repeat(80) + "\n";
      reportContent += "HISTORIQUE DES PROBLÈMES\n";
      reportContent += "=".repeat(80) + "\n\n";
      
      if (problemsToUse.length > 0) {
        problemsToUse.forEach((item, index) => {
          reportContent += `${index + 1}. ${item.titre}\n`;
          reportContent += `   Occurrences: ${item.occurrences}\n`;
          reportContent += `   Dernière occurrence: ${item.dernier ? new Date(item.dernier).toLocaleDateString('fr-FR') : 'N/A'}\n\n`;
        });
      } else {
        reportContent += "Aucun problème récurrent dans l'historique.\n\n";
      }
      
      reportContent += "=".repeat(80) + "\n";
      reportContent += "PROBLÈMES LES PLUS FRÉQUENTS\n";
      reportContent += "=".repeat(80) + "\n\n";
      
      if (mostFrequentToUse.length > 0) {
        mostFrequentToUse.forEach((item, index) => {
          reportContent += `${index + 1}. ${item.problème}\n`;
          reportContent += `   Occurrences: ${item.occurrences}\n\n`;
        });
      } else {
        reportContent += "Aucun problème fréquent identifié.\n\n";
      }
      
      reportContent += "=".repeat(80) + "\n";
      reportContent += "APPLICATIONS/ÉQUIPEMENTS PROBLÉMATIQUES\n";
      reportContent += "=".repeat(80) + "\n\n";
      
      if (problematicAppsToUse.length > 0) {
        problematicAppsToUse.forEach((item, index) => {
          reportContent += `${index + 1}. ${item.application}\n`;
          reportContent += `   Nombre de tickets: ${item.tickets}\n\n`;
        });
      } else {
        reportContent += "Aucune application ou équipement problématique identifié.\n\n";
      }
      
      // Afficher le rapport dans une nouvelle fenêtre
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Rapport: ${reportName}</title>
              <style>
                body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
                h1 { color: #1e3a5f; }
              </style>
            </head>
            <body>
              <h1>Rapport: ${reportName}</h1>
              <pre>${reportContent}</pre>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } else {
      // Afficher un rapport générique pour les autres types
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Rapport: ${reportName}</title>
              <style>
                body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
                h1 { color: #1e3a5f; }
              </style>
            </head>
            <body>
              <h1>Rapport: ${reportName}</h1>
              <pre>RAPPORT: ${reportName}
Date de génération: ${new Date().toLocaleDateString('fr-FR')}
Heure de génération: ${new Date().toLocaleTimeString('fr-FR')}

Ce rapport est actuellement en cours de développement.
Les données détaillées seront disponibles dans une prochaine version.</pre>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    }
  };

  async function handleAssign(ticketId: string) {
    if (!selectedTechnician) {
      alert("Veuillez sélectionner un technicien");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          technician_id: selectedTechnician,
          reason: "Assignation par Secrétaire/Adjoint DSI",
          notes: assignmentNotes || undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAllTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
        void (async () => {
          try {
            const ticketsRes = await fetch("http://localhost:8000/tickets/", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (ticketsRes.ok) {
              const ticketsData = await ticketsRes.json();
              setAllTickets(ticketsData);
            }
          } catch {}
        })();
        setSelectedTicket(null);
        setSelectedTechnician("");
        setAssignmentNotes("");
        setShowAssignModal(false);
        setAssignModalTicketId(null);
        alert("Ticket assigné avec succès");
      } else {
        let errorMessage = "Impossible d'assigner le ticket";
        try {
          const error = await res.json();
          errorMessage = error.detail || error.message || errorMessage;
        } catch (e) {
          const errorText = await res.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        alert(`Erreur: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Erreur assignation:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'assignation";
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadTicketDetails(ticketId: string) {
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTicketDetails(data);
        await loadTicketHistory(ticketId);
        setViewTicketDetails(ticketId);
      } else {
        alert("Erreur lors du chargement des détails du ticket");
      }
    } catch {
      alert("Erreur lors du chargement des détails");
    }
  }

  async function loadTicketHistory(ticketId: string) {
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTicketHistory(Array.isArray(data) ? data : []);
      } else {
        setTicketHistory([]);
      }
    } catch {
      setTicketHistory([]);
    }
  }

  async function handleReassign(ticketId: string) {
    if (!selectedTechnician) {
      alert("Veuillez sélectionner un technicien");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/reassign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          technician_id: selectedTechnician,
          reason: "Réassignation par " + (selectedTicket === ticketId ? "l'agent" : ""),
        }),
      });

      if (res.ok) {
        const ticketsRes = await fetch("http://localhost:8000/tickets/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setAllTickets(ticketsData);
        }
        setSelectedTicket(null);
        setSelectedTechnician("");
        alert("Ticket réassigné avec succès");
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.detail || "Impossible de réassigner le ticket"}`);
      }
    } catch (err) {
      console.error("Erreur réassignation:", err);
      alert("Erreur lors de la réassignation");
    } finally {
      setLoading(false);
    }
  }

  async function handleEscalate(ticketId: string) {
    if (!confirm("Êtes-vous sûr de vouloir escalader ce ticket ? La priorité sera augmentée.")) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/escalate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const ticketsRes = await fetch("http://localhost:8000/tickets/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setAllTickets(ticketsData);
        }
        alert("Ticket escaladé avec succès");
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.detail || "Impossible d'escalader le ticket"}`);
      }
    } catch (err) {
      console.error("Erreur escalade:", err);
      alert("Erreur lors de l'escalade");
    } finally {
      setLoading(false);
    }
  }

  async function handleClose(ticketId: string) {
    if (!confirm("Êtes-vous sûr de vouloir clôturer ce ticket ?")) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "cloture",
        }),
      });

      if (res.ok) {
        const ticketsRes = await fetch("http://localhost:8000/tickets/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setAllTickets(ticketsData);
        }
        alert("Ticket clôturé avec succès");
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.detail || "Impossible de clôturer le ticket"}`);
      }
    } catch (err) {
      console.error("Erreur clôture:", err);
      alert("Erreur lors de la clôture");
    } finally {
      setLoading(false);
    }
  }

  async function loadRejectionReason(ticketId: string) {
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const history = await res.json();
        console.log("Historique du ticket:", history); // Debug
        // Trouver l'entrée d'historique correspondant au rejet
        const rejectionEntry = history.find((h: any) => 
          h.new_status === "rejete" && h.reason && (
            h.reason.includes("Validation utilisateur: Rejeté") || 
            h.reason.includes("Rejeté")
          )
        );
        console.log("Entrée de rejet trouvée:", rejectionEntry); // Debug
        if (rejectionEntry && rejectionEntry.reason) {
          // Extraire le motif du format "Validation utilisateur: Rejeté. Motif: [motif]"
          const match = rejectionEntry.reason.match(/Motif:\s*(.+)/);
          const extractedReason = match ? match[1].trim() : rejectionEntry.reason;
          console.log("Motif extrait:", extractedReason); // Debug
          return extractedReason;
        }
      } else {
        console.error("Erreur HTTP:", res.status, res.statusText);
      }
      return "Motif non disponible";
    } catch (err) {
      console.error("Erreur chargement historique:", err);
      return "Erreur lors du chargement du motif";
    }
  }

  async function handleReopenClick(ticketId: string) {
    setReopenTicketId(ticketId);
    setShowReopenModal(true);
    setSelectedTechnician("");
    setAssignmentNotes("");
    setRejectionReason("");
    setLoadingRejectionReason(true);
    
    try {
      const reason = await loadRejectionReason(ticketId);
      setRejectionReason(reason);
    } catch (err) {
      console.error("Erreur:", err);
      setRejectionReason("Erreur lors du chargement du motif de rejet");
    } finally {
      setLoadingRejectionReason(false);
    }
  }

  async function handleReopen(ticketId: string) {
    if (!selectedTechnician) {
      alert("Veuillez sélectionner un technicien pour la réouverture");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/tickets/${ticketId}/reopen`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          technician_id: selectedTechnician,
          reason: assignmentNotes || "Réouverture après rejet utilisateur",
        }),
      });

      if (res.ok) {
        const ticketsRes = await fetch("http://localhost:8000/tickets/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setAllTickets(ticketsData);
        }
        setSelectedTicket(null);
        setSelectedTechnician("");
        setAssignmentNotes("");
        setReopenTicketId(null);
        setRejectionReason("");
        setShowReopenModal(false);
        alert("Ticket réouvert et réassigné avec succès");
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.detail || "Impossible de réouvrir le ticket"}`);
      }
    } catch (err) {
      console.error("Erreur réouverture:", err);
      alert("Erreur lors de la réouverture");
    } finally {
      setLoading(false);
    }
  }

  // Filtrer les tickets selon leur statut
  const pendingTickets = allTickets.filter((t) => t.status === "en_attente_analyse");
  const assignedTickets = allTickets.filter((t) => t.status === "assigne_technicien" || t.status === "en_cours");
  const resolvedTickets = allTickets.filter((t) => t.status === "resolu");

  const pendingCount = pendingTickets.length;
  const assignedCount = assignedTickets.length;
  const resolvedCount = resolvedTickets.length;

  // Filtrer les tickets selon les filtres sélectionnés
  let filteredTickets = allTickets;
  
  if (statusFilter !== "all") {
    if (statusFilter === "en_traitement") {
      filteredTickets = filteredTickets.filter((t) => t.status === "assigne_technicien" || t.status === "en_cours");
    } else {
      filteredTickets = filteredTickets.filter((t) => t.status === statusFilter);
    }
  }
  
  if (agencyFilter !== "all") {
    filteredTickets = filteredTickets.filter((t) => {
      const agency = t.creator?.agency || t.user_agency;
      return agency === agencyFilter;
    });
  }
  
  if (priorityFilter !== "all") {
    filteredTickets = filteredTickets.filter((t) => t.priority === priorityFilter);
  }
  
  // Filtre par délégation (UNIQUEMENT pour l'adjoint DSI)
  if (roleName === "Adjoint DSI" && delegationFilter !== "all") {
    if (delegationFilter === "delegated") {
      filteredTickets = filteredTickets.filter((t) => t.secretary_id === userInfo?.id);
    } else if (delegationFilter === "not_delegated") {
      filteredTickets = filteredTickets.filter((t) => t.secretary_id !== userInfo?.id);
    }
  }

  // Récupérer toutes les agences uniques
  const allAgencies = Array.from(new Set(
    allTickets.map((t) => t.creator?.agency || t.user_agency).filter(Boolean)
  ));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", background: "#f5f5f5" }}>
      {/* Sidebar */}
      <style>{`
        .sidebar-custom::-webkit-scrollbar {
          display: none;
        }
        .sidebar-custom {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="sidebar-custom" style={{ 
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: sidebarCollapsed ? "80px" : "250px", 
        background: "#1e293b", 
        color: "white", 
        padding: "20px",
        paddingTop: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        transition: "width 0.3s ease",
        overflowY: "auto",
        zIndex: 100,
        boxSizing: "border-box"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: "30px",
          marginTop: "0px",
          paddingBottom: "10px",
          paddingTop: "0px",
          borderBottom: "1px solid rgba(255,255,255,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                <path d="M4 7L12 11L20 7" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 11V21" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div style={{ fontSize: "18px", fontWeight: "600", whiteSpace: "nowrap" }}>
                Gestion d'Incidents
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                marginLeft: "8px",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <PanelLeft size={20} color="white" />
            </div>
          )}
          {sidebarCollapsed && (
            <div
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                margin: "0 auto",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <PanelLeft size={20} color="white" style={{ transform: "rotate(180deg)" }} />
            </div>
          )}
        </div>
        <div 
          onClick={() => setActiveSection("dashboard")}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px", 
            padding: "12px", 
            background: activeSection === "dashboard" ? "rgba(255,255,255,0.1)" : "transparent", 
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock3 size={18} color="white" />
          </div>
          <div>Tableau de Bord</div>
        </div>
        <div 
          onClick={() => {
            setStatusFilter("all");
            setActiveSection("tickets");
          }}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px", 
            padding: "12px", 
            background: activeSection === "tickets" ? "rgba(255,255,255,0.1)" : "transparent",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <div>Tickets</div>
        </div>
        {(roleName === "Adjoint DSI" || roleName === "DSI" || roleName === "Admin") && (
          <div style={{ position: "relative" }}>
            <div 
              onClick={() => setShowReportsDropdown(!showReportsDropdown)}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "12px", 
                padding: "12px", 
                background: activeSection === "reports" ? "rgba(255,255,255,0.1)" : "transparent",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileBarChart size={18} color="white" />
              </div>
              <div style={{ flex: 1 }}>Rapports</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s ease" }}>
                {showReportsDropdown ? (
                  <ChevronDown size={16} color="white" />
                ) : (
                  <ChevronRight size={16} color="white" />
                )}
              </div>
            </div>
            {showReportsDropdown && (
              <div style={{ 
                marginLeft: "36px", 
                marginTop: "8px", 
                display: "flex", 
                flexDirection: "column", 
                gap: "4px" 
              }}>
                <div 
                  onClick={() => {
                    setSelectedReport("statistiques");
                    setActiveSection("reports");
                  }}
                  style={{ 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    background: selectedReport === "statistiques" ? "rgba(255,255,255,0.1)" : "transparent"
                  }}
                >
                  Statistiques générales
                </div>
                <div 
                  onClick={() => {
                    setSelectedReport("metriques");
                    setActiveSection("reports");
                  }}
                  style={{ 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    background: selectedReport === "metriques" ? "rgba(255,255,255,0.1)" : "transparent"
                  }}
                >
                  Métriques de performance
                </div>
                <div 
                  onClick={() => {
                    setSelectedReport("agence");
                    setActiveSection("reports");
                  }}
                  style={{ 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    background: selectedReport === "agence" ? "rgba(255,255,255,0.1)" : "transparent"
                  }}
                >
                  Analyses par agence
                </div>
                <div 
                  onClick={() => {
                    setSelectedReport("technicien");
                    setActiveSection("reports");
                  }}
                  style={{ 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    background: selectedReport === "technicien" ? "rgba(255,255,255,0.1)" : "transparent"
                  }}
                >
                  Analyses par technicien
                </div>
                <div 
                  onClick={() => {
                    setSelectedReport("evolutions");
                    setActiveSection("reports");
                  }}
                  style={{ 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    background: selectedReport === "evolutions" ? "rgba(255,255,255,0.1)" : "transparent"
                  }}
                >
                  Évolutions dans le temps
                </div>
                <div 
                  onClick={() => {
                    setSelectedReport("recurrents");
                    setActiveSection("reports");
                  }}
                  style={{ 
                    padding: "8px 12px", 
                    borderRadius: "4px", 
                    cursor: "pointer",
                    background: selectedReport === "recurrents" ? "rgba(255,255,255,0.1)" : "transparent"
                  }}
                >
                  Problèmes récurrents
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bouton Déconnexion */}
        <div
          onClick={handleLogout}
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            color: "white",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="16 17 21 12 16 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="21"
                y1="12"
                x2="9"
                y2="12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ fontSize: "14px", color: "white" }}>Déconnexion</div>
        </div>

        {/* Bottom user block in sidebar */}
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: 600
            }}>
              {(userInfo?.full_name || "Utilisateur").charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "white", fontSize: "14px" }}>
                {userInfo?.full_name || "Utilisateur"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></div>
                <div style={{ color: "white", fontSize: "12px" }}>En ligne</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        overflow: "hidden",
        marginLeft: sidebarCollapsed ? "80px" : "250px",
        transition: "margin-left 0.3s ease"
      }}>
        {/* Barre de navigation en haut */}
        <div style={{
          position: "fixed",
          top: 0,
          left: sidebarCollapsed ? "80px" : "250px",
          right: 0,
          background: "#1e293b",
          padding: "16px 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "20px",
          borderBottom: "1px solid #0f172a",
          zIndex: 99,
          transition: "left 0.3s ease"
        }}>
          {/* Icône panier - tickets à assigner */}
          <div
            style={{
              cursor: "default",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              position: "relative",
              opacity: pendingCount > 0 ? 1 : 0.5,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6h15l-1.5 9h-12L4 3H2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="20" r="1.5" fill="white" />
              <circle cx="17" cy="20" r="1.5" fill="white" />
            </svg>
            {pendingCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-4px",
                  right: "-4px",
                  minWidth: "18px",
                  height: "18px",
                  background: "#22c55e",
                  borderRadius: "50%",
                  border: "2px solid #1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "white",
                  padding: "0 4px",
                }}
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </div>

          {/* Cloche notifications */}
          <div 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              cursor: "pointer", 
              width: "24px", 
              height: "24px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "white",
              position: "relative"
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="currentColor"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="currentColor"/>
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                minWidth: "18px",
                height: "18px",
                background: "#ef4444",
                borderRadius: "50%",
                border: "2px solid #1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: "bold",
                color: "white",
                padding: "0 4px"
              }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Contenu principal avec scroll */}
        <div style={{ flex: 1, padding: "30px", overflow: "auto", paddingTop: "80px" }}>
          {activeSection === "dashboard" && (
          <>
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "28px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
                  Centre d'Assignation
                </div>
                <div style={{ fontSize: "15px", color: "#4b5563" }}>
                  Répartissez les tickets à votre équipe technique
                </div>
              </div>

      {/* Métriques principales */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(200px, 1fr))",
          gap: "10px",
          margin: "20px 0",
        }}
      >
        {/* Tickets en attente */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "10px 12px",
            boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#fff4e6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock3 size={18} color="#ff8a3c" />
            </div>
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "3px",
            }}
          >
            {pendingCount}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#374151" }}>
            Tickets en attente
          </div>
          <div style={{ marginTop: "2px", fontSize: "10px", color: "#6b7280" }}>
            Action requise
          </div>
        </div>

        {/* Tickets assignés */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "10px 12px",
            boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#e5f0ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "8px",
            }}
          >
            <Users size={18} color="#2563eb" />
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "3px",
            }}
          >
            {assignedCount}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#374151" }}>
            Tickets assignés
          </div>
          <div style={{ marginTop: "2px", fontSize: "10px", color: "#6b7280" }}>
            En traitement
          </div>
        </div>

        {/* Tickets résolus */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "10px 12px",
            boxShadow: "0 6px 18px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "8px",
            }}
          >
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "3px",
            }}
          >
            {resolvedCount}
          </div>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "#374151" }}>
            Tickets résolus
          </div>
          <div style={{ marginTop: "2px", fontSize: "10px", color: "#6b7280" }}>
            Aujourd&apos;hui
          </div>
        </div>
      </div>

              <h3 style={{ marginTop: "32px" }}>Tickets Récents</h3>
              
              {/* Filtres */}
              <div style={{ 
                display: "flex", 
                gap: "16px", 
                marginTop: "16px",
                marginBottom: "24px", 
                flexWrap: "wrap",
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 12px", 
                      border: "1px solid #ddd", 
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="en_attente_analyse">En attente</option>
                    <option value="en_traitement">En traitement</option>
                    <option value="resolu">Résolus</option>
                    <option value="cloture">Clôturés</option>
                    <option value="rejete">Rejetés</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par agence</label>
                  <select
                    value={agencyFilter}
                    onChange={(e) => setAgencyFilter(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 12px", 
                      border: "1px solid #ddd", 
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="all">Toutes les agences</option>
                    {Array.from(new Set(allTickets.map((t) => (t.creator?.agency || t.user_agency)).filter(Boolean))).map((agency) => (
                      <option key={agency || ""} value={agency || ""}>{agency}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par priorité</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 12px", 
                      border: "1px solid #ddd", 
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="all">Toutes les priorités</option>
                    <option value="critique">Critique</option>
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="faible">Faible</option>
                  </select>
                </div>
                {roleName === "Adjoint DSI" && (
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par délégation</label>
                    <select
                      value={delegationFilter}
                      onChange={(e) => setDelegationFilter(e.target.value)}
                      style={{ 
                        width: "100%", 
                        padding: "8px 12px", 
                        border: "1px solid #ddd", 
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <option value="all">Tous les tickets</option>
                      <option value="delegated">Tickets délégués par DSI</option>
                      <option value="not_delegated">Tickets non délégués</option>
                    </select>
                  </div>
                )}
              </div>
              
              {(() => {
                // Filtrer les tickets selon les filtres sélectionnés
                let filtered = [...allTickets];
                
                // Filtre par statut
                if (statusFilter !== "all") {
                  if (statusFilter === "en_traitement") {
                    filtered = filtered.filter((t) => t.status === "assigne_technicien" || t.status === "en_cours");
                  } else {
                    filtered = filtered.filter((t) => t.status === statusFilter);
                  }
                }
                
                // Filtre par agence
                if (agencyFilter !== "all") {
                  filtered = filtered.filter((t) => (t.creator?.agency || t.user_agency) === agencyFilter);
                }
                
                // Filtre par priorité
                if (priorityFilter !== "all") {
                  filtered = filtered.filter((t) => t.priority === priorityFilter);
                }
                
                // Filtre par délégation (UNIQUEMENT pour l'adjoint DSI)
                if (roleName === "Adjoint DSI" && delegationFilter !== "all") {
                  if (delegationFilter === "delegated") {
                    filtered = filtered.filter((t) => t.secretary_id === userInfo?.id);
                  } else if (delegationFilter === "not_delegated") {
                    filtered = filtered.filter((t) => t.secretary_id !== userInfo?.id);
                  }
                }
                
                // Obtenir les tickets récents triés par date de création décroissante
                const recentTickets = filtered
                  .sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                  })
                  .slice(0, 5);
                
                return (
              <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <thead>
          <tr style={{ background: "#f8f9fa" }}>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>ID</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Titre</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Nom</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Agence</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Priorité</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Statut</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recentTickets.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                Aucun ticket
              </td>
            </tr>
          ) : (
            recentTickets.map((t) => {
              const isDelegatedToMe = roleName === "Adjoint DSI" && t.secretary_id === userInfo?.id;
              return (
              <tr key={t.id} data-ticket-id={t.id} style={{ borderBottom: "1px solid #eee", background: isDelegatedToMe ? "#fff3cd" : "transparent" }}>
                <td style={{ padding: "12px 16px" }}>#{t.number}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {t.title}
                    {isDelegatedToMe && (
                      <span style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "600",
                        background: "#ffc107",
                        color: "#856404",
                        whiteSpace: "nowrap"
                      }}>
                        Délégué
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {t.creator ? t.creator.full_name : "N/A"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {t.creator ? (t.creator.agency || t.user_agency || "N/A") : (t.user_agency || "N/A")}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: t.priority === "critique" ? "#f44336" : t.priority === "haute" ? "#fed7aa" : t.priority === "moyenne" ? "#E3F2FD" : t.priority === "faible" ? "#fee2e2" : "#9e9e9e",
                    color: t.priority === "haute" ? "#92400e" : t.priority === "faible" ? "#991b1b" : t.priority === "moyenne" ? "#1565C0" : "white"
                  }}>
                    {t.priority}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "500",
                    background: t.status === "en_attente_analyse" ? "#fef3c7" : 
                               t.status === "assigne_technicien" ? "#007bff" : 
                               t.status === "en_cours" ? "#FFDAB9" : 
                               t.status === "resolu" ? "#d4edda" : 
                               t.status === "cloture" ? "#E0E0E0" :
                               t.status === "rejete" ? "#dc3545" : "#e0e0e0",
                    color: t.status === "resolu" ? "#155724" : t.status === "en_attente_analyse" ? "#92400e" : t.status === "en_cours" ? "#8B4513" : t.status === "cloture" ? "#333" : "white",
                    whiteSpace: "nowrap",
                    display: "inline-block"
                  }}>
                    {t.status === "en_attente_analyse" ? "En attente" :
                     t.status === "assigne_technicien" ? "Assigné" :
                     t.status === "en_cours" ? "En cours" :
                     t.status === "resolu" ? "Résolu" :
                     t.status === "cloture" ? "Clôturé" :
                     t.status === "rejete" ? "Rejeté" : t.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  {t.status === "en_attente_analyse" ? (
                    // Actions pour tickets en attente
                    selectedTicket === t.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
                        <select
                          value={selectedTechnician}
                          onChange={(e) => setSelectedTechnician(e.target.value)}
                          style={{ padding: "4px 8px", fontSize: "12px", minWidth: "200px" }}
                        >
                          <option value="">Sélectionner un technicien</option>
                          {getFilteredTechnicians(t.type).map((tech) => {
                            const workload = allTickets.filter((tk) => 
                              tk.technician_id === tech.id && 
                              (tk.status === "assigne_technicien" || tk.status === "en_cours")
                            ).length;
                            const specialization = tech.specialization ? ` (${tech.specialization})` : "";
                            return (
                              <option key={tech.id} value={tech.id}>
                                {tech.full_name}{specialization} - {workload} ticket(s)
                              </option>
                            );
                          })}
                        </select>
                        <textarea
                          value={assignmentNotes}
                          onChange={(e) => setAssignmentNotes(e.target.value)}
                          placeholder="Notes/Instructions pour le technicien (optionnel)"
                          rows={2}
                          style={{
                            width: "100%",
                            padding: "6px",
                            fontSize: "12px",
                            border: "1px solid #ddd",
                            borderRadius: "4px"
                          }}
                        />
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => handleAssign(t.id)}
                            disabled={loading || !selectedTechnician}
                            style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: loading || !selectedTechnician ? "not-allowed" : "pointer", opacity: loading || !selectedTechnician ? 0.6 : 1 }}
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTicket(null);
                              setSelectedTechnician("");
                              setAssignmentNotes("");
                            }}
                            style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            
                            setOpenActionsMenuFor(openActionsMenuFor === t.id ? null : t.id);
                          }}
                          disabled={loading}
                          title="Actions"
                          aria-label="Actions"
                          style={{
                            width: 28,
                            height: 28,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            border: "none",
                            borderRadius: 0,
                            cursor: "pointer",
                            color: "#475569",
                            backgroundImage:
                              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            backgroundSize: "18px 18px"
                          }}
                        />
                        {openActionsMenuFor === t.id &&  (
                          <div
                            style={{
                              position: "fixed",
                              background: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 10000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const buttonRect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - buttonRect.bottom;
                                  const spaceAbove = buttonRect.top;
                                  const minimumSpaceAbove = menuHeight + margin + 100;
                                  
                                  // Calculer la position du menu par rapport à la fenêtre (position: fixed)
                                  const menuWidth = el.offsetWidth || 160;
                                  let top: number;
                                  let left: number;
                                  
                                  // Déterminer si on affiche vers le haut ou vers le bas
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    // Afficher vers le haut : positionner au-dessus du bouton
                                    top = buttonRect.top - menuHeight - margin;
                                  } else {
                                    // Afficher vers le bas : positionner en dessous du bouton
                                    top = buttonRect.bottom + margin;
                                  }
                                  
                                  // Positionner à droite du bouton
                                  left = buttonRect.right - menuWidth;
                                  
                                  // S'assurer que le menu ne dépasse pas de la fenêtre
                                  if (left < 8) left = 8;
                                  if (top < 8) top = 8;
                                  if (top + menuHeight > viewportHeight - 8) {
                                    top = viewportHeight - menuHeight - 8;
                                  }
                                  
                                  el.style.top = `${top}px`;
                                  el.style.left = `${left}px`;
                                  el.style.right = "auto";
                                  el.style.bottom = "auto";
                                }
                              }
                            }}
                          >
                            <button
                              onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                              disabled={loading}
                              style={{ 
                                width: "100%", 
                                padding: "10px 12px", 
                                background: "transparent", 
                                border: "none", 
                                textAlign: "left", 
                                cursor: "pointer",
                                color: "#111827",
                                fontSize: "14px",
                                display: "block",
                                whiteSpace: "nowrap"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                            >
                              Voir détails
                            </button>
                            {!t.technician_id && (
                              <>
                                <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                <button
                                  onClick={() => { 
                                    if (roleName === "Adjoint DSI") {
                                      setAssignModalTicketId(t.id);
                                      setShowAssignModal(true);
                                    } else {
                                      setSelectedTicket(t.id);
                                    }
                                    setOpenActionsMenuFor(null);
                                  }}
                                  disabled={loading}
                                  style={{ 
                                    width: "100%", 
                                    padding: "10px 12px", 
                                    background: "transparent", 
                                    border: "none", 
                                    textAlign: "left", 
                                    cursor: loading ? "not-allowed" : "pointer",
                                    color: "#111827",
                                    fontSize: "14px",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                    opacity: loading ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading) {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }}
                                >
                                  Assigner
                                </button>
                              </>
                            )}
                            {roleName !== "Secrétaire DSI" && (
                              <>
                                <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                <button
                                  onClick={() => { handleEscalate(t.id); setOpenActionsMenuFor(null); }}
                                  disabled={loading}
                                  style={{ 
                                    width: "100%", 
                                    padding: "10px 12px", 
                                    background: "transparent", 
                                    border: "none", 
                                    textAlign: "left", 
                                    cursor: loading ? "not-allowed" : "pointer",
                                    color: "#111827",
                                    fontSize: "14px",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                    opacity: loading ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading) {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }}
                                >
                                  Escalader
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  ) : t.status === "assigne_technicien" || t.status === "en_cours" ? (
                    // Actions pour tickets assignés/en cours
                    selectedTicket === t.id ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={selectedTechnician}
                          onChange={(e) => setSelectedTechnician(e.target.value)}
                          style={{ padding: "4px 8px", fontSize: "12px", minWidth: "150px" }}
                        >
                          <option value="">Sélectionner un technicien</option>
                          {getFilteredTechnicians(t.type).map((tech) => {
                            const workload = allTickets.filter((tk) => 
                              tk.technician_id === tech.id && 
                              (tk.status === "assigne_technicien" || tk.status === "en_cours")
                            ).length;
                            const specialization = tech.specialization ? ` (${tech.specialization})` : "";
                            return (
                              <option key={tech.id} value={tech.id}>
                                {tech.full_name}{specialization} - {workload} ticket(s)
                              </option>
                            );
                          })}
                        </select>
                        <button
                          onClick={() => handleReassign(t.id)}
                          disabled={loading}
                          style={{ 
                            fontSize: "12px", 
                            padding: "6px 12px", 
                            backgroundColor: "#dbeafe", 
                            color: "#1e40af", 
                            border: "1px solid #93c5fd",
                            borderRadius: "20px", 
                            cursor: loading ? "not-allowed" : "pointer",
                            fontWeight: "500",
                            transition: "all 0.2s ease",
                            opacity: loading ? 0.6 : 1
                          }}
                          onMouseEnter={(e) => {
                            if (!loading) {
                              e.currentTarget.style.backgroundColor = "#bfdbfe";
                              e.currentTarget.style.borderColor = "#60a5fa";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!loading) {
                              e.currentTarget.style.backgroundColor = "#dbeafe";
                              e.currentTarget.style.borderColor = "#93c5fd";
                            }
                          }}
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTicket(null);
                            setSelectedTechnician("");
                          }}
                          style={{ 
                            fontSize: "12px", 
                            padding: "6px 12px", 
                            backgroundColor: "#e5e7eb", 
                            color: "#374151", 
                            border: "1px solid #d1d5db",
                            borderRadius: "20px", 
                            cursor: "pointer",
                            fontWeight: "500",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#d1d5db";
                            e.currentTarget.style.borderColor = "#9ca3af";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#e5e7eb";
                            e.currentTarget.style.borderColor = "#d1d5db";
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            
                            setOpenActionsMenuFor(openActionsMenuFor === t.id ? null : t.id);
                          }}
                          disabled={loading}
                          title="Actions"
                          aria-label="Actions"
                          style={{
                            width: 28,
                            height: 28,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            border: "none",
                            borderRadius: 0,
                            cursor: "pointer",
                            color: "#475569",
                            backgroundImage:
                              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            backgroundSize: "18px 18px"
                          }}
                        />
                        {openActionsMenuFor === t.id &&  (
                          <div
                            style={{
                              position: "fixed",
                              background: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 10000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const buttonRect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - buttonRect.bottom;
                                  const spaceAbove = buttonRect.top;
                                  const minimumSpaceAbove = menuHeight + margin + 100;
                                  
                                  // Calculer la position du menu par rapport à la fenêtre (position: fixed)
                                  const menuWidth = el.offsetWidth || 160;
                                  let top: number;
                                  let left: number;
                                  
                                  // Déterminer si on affiche vers le haut ou vers le bas
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    // Afficher vers le haut : positionner au-dessus du bouton
                                    top = buttonRect.top - menuHeight - margin;
                                  } else {
                                    // Afficher vers le bas : positionner en dessous du bouton
                                    top = buttonRect.bottom + margin;
                                  }
                                  
                                  // Positionner à droite du bouton
                                  left = buttonRect.right - menuWidth;
                                  
                                  // S'assurer que le menu ne dépasse pas de la fenêtre
                                  if (left < 8) left = 8;
                                  if (top < 8) top = 8;
                                  if (top + menuHeight > viewportHeight - 8) {
                                    top = viewportHeight - menuHeight - 8;
                                  }
                                  
                                  el.style.top = `${top}px`;
                                  el.style.left = `${left}px`;
                                  el.style.right = "auto";
                                  el.style.bottom = "auto";
                                }
                              }
                            }}
                          >
                            <button
                              onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                              disabled={loading}
                              style={{ 
                                width: "100%", 
                                padding: "10px 12px", 
                                background: "transparent", 
                                border: "none", 
                                textAlign: "left", 
                                cursor: "pointer",
                                color: "#111827",
                                fontSize: "14px",
                                display: "block",
                                whiteSpace: "nowrap"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                            >
                              Voir détails
                            </button>
                            <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                            <button
                              onClick={() => { setSelectedTicket(t.id); setOpenActionsMenuFor(null); }}
                              disabled={loading}
                              style={{ 
                                width: "100%", 
                                padding: "10px 12px", 
                                background: "transparent", 
                                border: "none", 
                                textAlign: "left", 
                                cursor: loading ? "not-allowed" : "pointer",
                                color: "#111827",
                                fontSize: "14px",
                                display: "block",
                                whiteSpace: "nowrap",
                                opacity: loading ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!loading) {
                                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                            >
                              Réassigner
                            </button>
                            {roleName !== "Secrétaire DSI" && (
                              <>
                                <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                <button
                                  onClick={() => { handleEscalate(t.id); setOpenActionsMenuFor(null); }}
                                  disabled={loading}
                                  style={{ 
                                    width: "100%", 
                                    padding: "10px 12px", 
                                    background: "transparent", 
                                    border: "none", 
                                    textAlign: "left", 
                                    cursor: loading ? "not-allowed" : "pointer",
                                    color: "#111827",
                                    fontSize: "14px",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                    opacity: loading ? 0.6 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading) {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                  }}
                                >
                                  Escalader
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  ) : t.status === "resolu" ? (
                    // Action pour tickets résolus
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          
                          const isOpen = openActionsMenuFor === t.id;
                          if (isOpen) {
                            setOpenActionsMenuFor(null);
(null);
                            return;
                          }

                          const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const menuWidth = 220;
                          const menuHeight = 120;

                          let top = buttonRect.bottom + 4;
                          if (viewportHeight - buttonRect.bottom < menuHeight && buttonRect.top > menuHeight) {
                            top = buttonRect.top - menuHeight - 4;
                          }

                          let left = buttonRect.right - menuWidth;
                          if (left < 8) left = 8;

({ top, left });
                          setOpenActionsMenuFor(t.id);
                        }}
                        disabled={loading}
                        title="Actions"
                        aria-label="Actions"
                        style={{
                          width: 28,
                          height: 28,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "none",
                          borderRadius: 0,
                          cursor: "pointer",
                          color: "#475569",
                          backgroundImage:
                            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                          backgroundSize: "18px 18px"
                        }}
                      />
                      {openActionsMenuFor === t.id &&  (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "4px",
                            background: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 1000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Seuil minimum pour afficher vers le haut : besoin de beaucoup d'espace en haut
                                  const minimumSpaceAbove = menuHeight + margin + 100; // Marge très importante
                                  
                                  // Réinitialiser tous les styles de positionnement d'abord
                                  el.style.removeProperty('top');
                                  el.style.removeProperty('bottom');
                                  el.style.removeProperty('margin-top');
                                  el.style.removeProperty('margin-bottom');
                                  
                                  // Afficher vers le haut UNIQUEMENT si:
                                  // 1. Il n'y a vraiment PAS assez d'espace en bas
                                  // 2. ET il y a BEAUCOUP d'espace en haut (au moins 320px = menu + margin + 100px de sécurité)
                                  // Cette condition très stricte évite le découpage du menu
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    el.style.bottom = "100%";
                                    el.style.top = "auto";
                                    el.style.marginBottom = `${margin}px`;
                                    el.style.marginTop = "0";
                                  } else {
                                    // TOUJOURS afficher vers le bas si la condition n'est pas remplie
                                    // Même si cela dépasse un peu, c'est mieux qu'un menu coupé
                                    el.style.top = "100%";
                                    el.style.bottom = "auto";
                                    el.style.marginTop = `${margin}px`;
                                    el.style.marginBottom = "0";
                                  }
                                }
                              }
                            }}
                          >
                          <button
                            onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                            disabled={loading}
                            style={{ 
                              width: "100%", 
                              padding: "10px 12px", 
                              background: "transparent", 
                              border: "none", 
                              textAlign: "left", 
                              cursor: "pointer",
                              color: "#111827",
                              fontSize: "14px",
                              display: "block",
                              whiteSpace: "nowrap"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            Voir détails
                          </button>
                          <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                          <button
                            onClick={() => { handleClose(t.id); setOpenActionsMenuFor(null); }}
                            disabled={loading}
                            style={{ 
                              width: "100%", 
                              padding: "10px 12px", 
                              background: "transparent", 
                              border: "none", 
                              textAlign: "left", 
                              cursor: loading ? "not-allowed" : "pointer",
                              color: "#111827",
                              fontSize: "14px",
                              display: "block",
                              whiteSpace: "nowrap",
                              opacity: loading ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            Clôturer
                          </button>
                        </div>
                      )}
                    </div>
                  ) : t.status === "rejete" ? (
                    // Action pour tickets rejetés - Réouverture
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          
                          const isOpen = openActionsMenuFor === t.id;
                          if (isOpen) {
                            setOpenActionsMenuFor(null);
(null);
                            return;
                          }

                          const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const menuWidth = 220;
                          const menuHeight = 120;

                          let top = buttonRect.bottom + 4;
                          if (viewportHeight - buttonRect.bottom < menuHeight && buttonRect.top > menuHeight) {
                            top = buttonRect.top - menuHeight - 4;
                          }

                          let left = buttonRect.right - menuWidth;
                          if (left < 8) left = 8;

({ top, left });
                          setOpenActionsMenuFor(t.id);
                        }}
                        disabled={loading}
                        title="Actions"
                        aria-label="Actions"
                        style={{
                          width: 28,
                          height: 28,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          border: "none",
                          borderRadius: 0,
                          cursor: "pointer",
                          color: "#475569",
                          backgroundImage:
                            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                          backgroundSize: "18px 18px"
                        }}
                      />
                      {openActionsMenuFor === t.id &&  (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            marginTop: "4px",
                            background: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                            boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 1000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Seuil minimum pour afficher vers le haut : besoin de beaucoup d'espace en haut
                                  const minimumSpaceAbove = menuHeight + margin + 100; // Marge très importante
                                  
                                  // Réinitialiser tous les styles de positionnement d'abord
                                  el.style.removeProperty('top');
                                  el.style.removeProperty('bottom');
                                  el.style.removeProperty('margin-top');
                                  el.style.removeProperty('margin-bottom');
                                  
                                  // Afficher vers le haut UNIQUEMENT si:
                                  // 1. Il n'y a vraiment PAS assez d'espace en bas
                                  // 2. ET il y a BEAUCOUP d'espace en haut (au moins 320px = menu + margin + 100px de sécurité)
                                  // Cette condition très stricte évite le découpage du menu
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    el.style.bottom = "100%";
                                    el.style.top = "auto";
                                    el.style.marginBottom = `${margin}px`;
                                    el.style.marginTop = "0";
                                  } else {
                                    // TOUJOURS afficher vers le bas si la condition n'est pas remplie
                                    // Même si cela dépasse un peu, c'est mieux qu'un menu coupé
                                    el.style.top = "100%";
                                    el.style.bottom = "auto";
                                    el.style.marginTop = `${margin}px`;
                                    el.style.marginBottom = "0";
                                  }
                                }
                              }
                            }}
                          >
                          <button
                            onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                            disabled={loading}
                            style={{ 
                              width: "100%", 
                              padding: "10px 12px", 
                              background: "transparent", 
                              border: "none", 
                              textAlign: "left", 
                              cursor: "pointer",
                              color: "#111827",
                              fontSize: "14px",
                              display: "block",
                              whiteSpace: "nowrap"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            Voir détails
                          </button>
                          <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                          <button
                            onClick={() => { handleReopenClick(t.id); setOpenActionsMenuFor(null); }}
                            disabled={loading}
                            style={{ 
                              width: "100%", 
                              padding: "10px 12px", 
                              background: "transparent", 
                              border: "none", 
                              textAlign: "left", 
                              cursor: loading ? "not-allowed" : "pointer",
                              color: "#111827",
                              fontSize: "14px",
                              display: "block",
                              whiteSpace: "nowrap",
                              opacity: loading ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.currentTarget.style.backgroundColor = "#f3f4f6";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                          >
                            Réouvrir
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Pas d'action pour tickets clôturés
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      {t.status === "cloture" ? "Clôturé" : "N/A"}
                    </span>
                  )}
                </td>
              </tr>
              );
            })
          )}
              </tbody>
              </table>
                );
              })()}
            </>
          )}

          {activeSection === "tickets" && (
            <>
              <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>Tous les tickets</h2>
              
              {/* Filtres */}
              <div style={{ 
                display: "flex", 
                gap: "16px", 
                marginBottom: "24px", 
                flexWrap: "wrap",
                background: "white",
                padding: "16px",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 12px", 
                      border: "1px solid #ddd", 
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="en_attente_analyse">En attente</option>
                    <option value="en_traitement">En traitement</option>
                    <option value="resolu">Résolus</option>
                    <option value="cloture">Clôturés</option>
                    <option value="rejete">Rejetés</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par agence</label>
                  <select
                    value={agencyFilter}
                    onChange={(e) => setAgencyFilter(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 12px", 
                      border: "1px solid #ddd", 
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="all">Toutes les agences</option>
                    {allAgencies.map((agency) => (
                      <option key={agency} value={agency || ""}>{agency}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par priorité</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "8px 12px", 
                      border: "1px solid #ddd", 
                      borderRadius: "4px",
                      fontSize: "14px"
                    }}
                  >
                    <option value="all">Toutes les priorités</option>
                    <option value="critique">Critique</option>
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="faible">Faible</option>
                  </select>
                </div>
                {roleName === "Adjoint DSI" && (
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#666" }}>Filtrer par délégation</label>
                    <select
                      value={delegationFilter}
                      onChange={(e) => setDelegationFilter(e.target.value)}
                      style={{ 
                        width: "100%", 
                        padding: "8px 12px", 
                        border: "1px solid #ddd", 
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <option value="all">Tous les tickets</option>
                      <option value="delegated">Tickets délégués par DSI</option>
                      <option value="not_delegated">Tickets non délégués</option>
                    </select>
                  </div>
                )}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>ID</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Titre</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Nom</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Agence</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Priorité</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Statut</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                        Aucun ticket
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((t) => {
                      const isDelegatedToMe = roleName === "Adjoint DSI" && t.secretary_id === userInfo?.id;
                      return (
                      <tr key={t.id} data-ticket-id={t.id} style={{ borderBottom: "1px solid #eee", background: isDelegatedToMe ? "#fff3cd" : "transparent" }}>
                        <td style={{ padding: "12px 16px" }}>#{t.number}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {t.title}
                            {isDelegatedToMe && (
                              <span style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "600",
                                background: "#ffc107",
                                color: "#856404",
                                whiteSpace: "nowrap"
                              }}>
                                Délégué
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {t.creator ? t.creator.full_name : "N/A"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {t.creator ? (t.creator.agency || t.user_agency || "N/A") : (t.user_agency || "N/A")}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            background: t.priority === "critique" ? "#f44336" : t.priority === "haute" ? "#fed7aa" : t.priority === "moyenne" ? "#E3F2FD" : t.priority === "faible" ? "#fee2e2" : "#9e9e9e",
                            color: t.priority === "haute" ? "#92400e" : t.priority === "faible" ? "#991b1b" : t.priority === "moyenne" ? "#1565C0" : "white"
                          }}>
                            {t.priority}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            background: t.status === "en_attente_analyse" ? "#fef3c7" : 
                                       t.status === "assigne_technicien" ? "#007bff" : 
                                       t.status === "en_cours" ? "#FFDAB9" : 
                                       t.status === "resolu" ? "#d4edda" : 
                                       t.status === "cloture" ? "#E0E0E0" :
                                       t.status === "rejete" ? "#dc3545" : "#e0e0e0",
                            color: t.status === "resolu" ? "#155724" : t.status === "en_attente_analyse" ? "#92400e" : t.status === "en_cours" ? "#8B4513" : t.status === "cloture" ? "#333" : "white",
                            whiteSpace: "nowrap",
                            display: "inline-block"
                          }}>
                            {t.status === "en_attente_analyse" ? "En attente" :
                             t.status === "assigne_technicien" ? "Assigné" :
                             t.status === "en_cours" ? "En cours" :
                             t.status === "resolu" ? "Résolu" :
                             t.status === "cloture" ? "Clôturé" :
                             t.status === "rejete" ? "Rejeté" : t.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {t.status === "en_attente_analyse" ? (
                            selectedTicket === t.id ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
                                <select
                                  value={selectedTechnician}
                                  onChange={(e) => setSelectedTechnician(e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: "12px", minWidth: "200px" }}
                                >
                                  <option value="">Sélectionner un technicien</option>
                                  {getFilteredTechnicians(t.type).map((tech) => {
                                    const workload = allTickets.filter((tk) => 
                              tk.technician_id === tech.id && 
                              (tk.status === "assigne_technicien" || tk.status === "en_cours")
                            ).length;
                                    const specialization = tech.specialization ? ` (${tech.specialization})` : "";
                                    return (
                                      <option key={tech.id} value={tech.id}>
                                        {tech.full_name}{specialization} - {workload} ticket(s)
                                      </option>
                                    );
                                  })}
                                </select>
                                <textarea
                                  value={assignmentNotes}
                                  onChange={(e) => setAssignmentNotes(e.target.value)}
                                  placeholder="Notes/Instructions pour le technicien (optionnel)"
                                  rows={2}
                                  style={{
                                    width: "100%",
                                    padding: "6px",
                                    fontSize: "12px",
                                    border: "1px solid #ddd",
                                    borderRadius: "4px"
                                  }}
                                />
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button
                                    onClick={() => handleAssign(t.id)}
                                    disabled={loading || !selectedTechnician}
                                    style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: loading || !selectedTechnician ? "not-allowed" : "pointer", opacity: loading || !selectedTechnician ? 0.6 : 1 }}
                                  >
                                    Confirmer
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedTicket(null);
                                      setSelectedTechnician("");
                                      setAssignmentNotes("");
                                    }}
                                    style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  
                                  const isOpen = openActionsMenuFor === t.id;
                                  if (isOpen) {
                                    setOpenActionsMenuFor(null);
(null);
                                    return;
                                  }

                                  const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuWidth = 220;
                                  const menuHeight = 220;

                                  let top = buttonRect.bottom + 4;
                                  if (viewportHeight - buttonRect.bottom < menuHeight && buttonRect.top > menuHeight) {
                                    top = buttonRect.top - menuHeight - 4;
                                  }

                                  let left = buttonRect.right - menuWidth;
                                  if (left < 8) left = 8;

({ top, left });
                                  setOpenActionsMenuFor(t.id);
                                }}
                                disabled={loading}
                                title="Actions"
                                aria-label="Actions"
                                style={{
                                  width: 28,
                                  height: 28,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "transparent",
                                  border: "none",
                                  borderRadius: 0,
                                  cursor: "pointer",
                                  color: "#475569",
                                  backgroundImage:
                                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                  backgroundSize: "18px 18px"
                                }}
                              />
                              {openActionsMenuFor === t.id &&  (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "4px",
                                    background: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 1000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Seuil minimum pour afficher vers le haut : besoin de beaucoup d'espace en haut
                                  const minimumSpaceAbove = menuHeight + margin + 100; // Marge très importante
                                  
                                  // Réinitialiser tous les styles de positionnement d'abord
                                  el.style.removeProperty('top');
                                  el.style.removeProperty('bottom');
                                  el.style.removeProperty('margin-top');
                                  el.style.removeProperty('margin-bottom');
                                  
                                  // Afficher vers le haut UNIQUEMENT si:
                                  // 1. Il n'y a vraiment PAS assez d'espace en bas
                                  // 2. ET il y a BEAUCOUP d'espace en haut (au moins 320px = menu + margin + 100px de sécurité)
                                  // Cette condition très stricte évite le découpage du menu
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    el.style.bottom = "100%";
                                    el.style.top = "auto";
                                    el.style.marginBottom = `${margin}px`;
                                    el.style.marginTop = "0";
                                  } else {
                                    // TOUJOURS afficher vers le bas si la condition n'est pas remplie
                                    // Même si cela dépasse un peu, c'est mieux qu'un menu coupé
                                    el.style.top = "100%";
                                    el.style.bottom = "auto";
                                    el.style.marginTop = `${margin}px`;
                                    el.style.marginBottom = "0";
                                  }
                                }
                              }
                            }}
                          >
                                  <button
                                    onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                                    disabled={loading}
                                    style={{ 
                                      width: "100%", 
                                      padding: "10px 12px", 
                                      background: "transparent", 
                                      border: "none", 
                                      textAlign: "left", 
                                      cursor: "pointer",
                                      color: "#111827",
                                      fontSize: "14px",
                                      display: "block",
                                      whiteSpace: "nowrap"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Voir détails
                                  </button>
                                  {!t.technician_id && (
                                    <>
                                      <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                      <button
                                        onClick={() => { 
                                          if (roleName === "Adjoint DSI") {
                                            setAssignModalTicketId(t.id);
                                            setShowAssignModal(true);
                                          } else {
                                            setSelectedTicket(t.id);
                                          }
                                          setOpenActionsMenuFor(null);
                                        }}
                                        disabled={loading}
                                        style={{ 
                                          width: "100%", 
                                          padding: "10px 12px", 
                                          background: "transparent", 
                                          border: "none", 
                                          textAlign: "left", 
                                          cursor: loading ? "not-allowed" : "pointer",
                                          color: "#111827",
                                          fontSize: "14px",
                                          display: "block",
                                          whiteSpace: "nowrap",
                                          opacity: loading ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!loading) {
                                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                        }}
                                      >
                                        Assigner
                                      </button>
                                    </>
                                  )}
                                  {roleName !== "Secrétaire DSI" && (
                                    <>
                                      <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                      <button
                                        onClick={() => { handleEscalate(t.id); setOpenActionsMenuFor(null); }}
                                        disabled={loading}
                                        style={{ 
                                          width: "100%", 
                                          padding: "10px 12px", 
                                          background: "transparent", 
                                          border: "none", 
                                          textAlign: "left", 
                                          cursor: loading ? "not-allowed" : "pointer",
                                          color: "#111827",
                                          fontSize: "14px",
                                          display: "block",
                                          whiteSpace: "nowrap",
                                          opacity: loading ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!loading) {
                                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = "transparent";
                                        }}
                                      >
                                        Escalader
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            )
                          ) : t.status === "assigne_technicien" || t.status === "en_cours" ? (
                            selectedTicket === t.id ? (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                <select
                                  value={selectedTechnician}
                                  onChange={(e) => setSelectedTechnician(e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: "12px", minWidth: "150px" }}
                                >
                                  <option value="">Sélectionner un technicien</option>
                                  {getFilteredTechnicians(t.type).map((tech) => {
                                    const workload = allTickets.filter((tk) => 
                              tk.technician_id === tech.id && 
                              (tk.status === "assigne_technicien" || tk.status === "en_cours")
                            ).length;
                                    const specialization = tech.specialization ? ` (${tech.specialization})` : "";
                                    return (
                                      <option key={tech.id} value={tech.id}>
                                        {tech.full_name}{specialization} - {workload} ticket(s)
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  onClick={() => handleReassign(t.id)}
                                  disabled={loading}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTicket(null);
                                    setSelectedTechnician("");
                                  }}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    
                                    const isOpen = openActionsMenuFor === t.id;
                                    if (isOpen) {
                                      setOpenActionsMenuFor(null);
(null);
                                      return;
                                    }

                                    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    const viewportHeight = window.innerHeight;
                                    const menuWidth = 220;
                                    const menuHeight = 220;

                                    let top = buttonRect.bottom + 4;
                                    if (viewportHeight - buttonRect.bottom < menuHeight && buttonRect.top > menuHeight) {
                                      top = buttonRect.top - menuHeight - 4;
                                    }

                                    let left = buttonRect.right - menuWidth;
                                    if (left < 8) left = 8;

({ top, left });
                                    setOpenActionsMenuFor(t.id);
                                  }}
                                  disabled={loading}
                                  title="Actions"
                                  aria-label="Actions"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background: "transparent",
                                    border: "none",
                                    borderRadius: 0,
                                    cursor: "pointer",
                                    color: "#475569",
                                    backgroundImage:
                                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "center",
                                    backgroundSize: "18px 18px"
                                  }}
                                />
                                {openActionsMenuFor === t.id &&  (
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "100%",
                                      right: 0,
                                      marginTop: "4px",
                                      background: "white",
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 8,
                                      boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 1000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Seuil minimum pour afficher vers le haut : besoin de beaucoup d'espace en haut
                                  const minimumSpaceAbove = menuHeight + margin + 100; // Marge très importante
                                  
                                  // Réinitialiser tous les styles de positionnement d'abord
                                  el.style.removeProperty('top');
                                  el.style.removeProperty('bottom');
                                  el.style.removeProperty('margin-top');
                                  el.style.removeProperty('margin-bottom');
                                  
                                  // Afficher vers le haut UNIQUEMENT si:
                                  // 1. Il n'y a vraiment PAS assez d'espace en bas
                                  // 2. ET il y a BEAUCOUP d'espace en haut (au moins 320px = menu + margin + 100px de sécurité)
                                  // Cette condition très stricte évite le découpage du menu
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    el.style.bottom = "100%";
                                    el.style.top = "auto";
                                    el.style.marginBottom = `${margin}px`;
                                    el.style.marginTop = "0";
                                  } else {
                                    // TOUJOURS afficher vers le bas si la condition n'est pas remplie
                                    // Même si cela dépasse un peu, c'est mieux qu'un menu coupé
                                    el.style.top = "100%";
                                    el.style.bottom = "auto";
                                    el.style.marginTop = `${margin}px`;
                                    el.style.marginBottom = "0";
                                  }
                                }
                              }
                            }}
                          >
                                    <button
                                      onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                                      disabled={loading}
                                      style={{ 
                                        width: "100%", 
                                        padding: "10px 12px", 
                                        background: "transparent", 
                                        border: "none", 
                                        textAlign: "left", 
                                        cursor: "pointer",
                                        color: "#111827",
                                        fontSize: "14px",
                                        display: "block",
                                        whiteSpace: "nowrap"
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                      }}
                                    >
                                      Voir détails
                                    </button>
                                    <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                    <button
                                      onClick={() => { setSelectedTicket(t.id); setOpenActionsMenuFor(null); }}
                                      disabled={loading}
                                      style={{ 
                                        width: "100%", 
                                        padding: "10px 12px", 
                                        background: "transparent", 
                                        border: "none", 
                                        textAlign: "left", 
                                        cursor: loading ? "not-allowed" : "pointer",
                                        color: "#111827",
                                        fontSize: "14px",
                                        display: "block",
                                        whiteSpace: "nowrap",
                                        opacity: loading ? 0.6 : 1
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!loading) {
                                          e.currentTarget.style.backgroundColor = "#f3f4f6";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                      }}
                                    >
                                      Réassigner
                                    </button>
                                    {roleName !== "Secrétaire DSI" && (
                                      <>
                                        <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                        <button
                                          onClick={() => { handleEscalate(t.id); setOpenActionsMenuFor(null); }}
                                          disabled={loading}
                                          style={{ 
                                            width: "100%", 
                                            padding: "10px 12px", 
                                            background: "transparent", 
                                            border: "none", 
                                            textAlign: "left", 
                                            cursor: loading ? "not-allowed" : "pointer",
                                            color: "#111827",
                                            fontSize: "14px",
                                            display: "block",
                                            whiteSpace: "nowrap",
                                            opacity: loading ? 0.6 : 1
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!loading) {
                                              e.currentTarget.style.backgroundColor = "#f3f4f6";
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = "transparent";
                                          }}
                                        >
                                          Escalader
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          ) : t.status === "resolu" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  
                                  const isOpen = openActionsMenuFor === t.id;
                                  if (isOpen) {
                                    setOpenActionsMenuFor(null);
(null);
                                    return;
                                  }

                                  const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuWidth = 220;
                                  const menuHeight = 120;

                                  let top = buttonRect.bottom + 4;
                                  if (viewportHeight - buttonRect.bottom < menuHeight && buttonRect.top > menuHeight) {
                                    top = buttonRect.top - menuHeight - 4;
                                  }

                                  let left = buttonRect.right - menuWidth;
                                  if (left < 8) left = 8;

({ top, left });
                                  setOpenActionsMenuFor(t.id);
                                }}
                                disabled={loading}
                                title="Actions"
                                aria-label="Actions"
                                style={{
                                  width: 28,
                                  height: 28,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "transparent",
                                  border: "none",
                                  borderRadius: 0,
                                  cursor: "pointer",
                                  color: "#475569",
                                  backgroundImage:
                                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                  backgroundSize: "18px 18px"
                                }}
                              />
                              {openActionsMenuFor === t.id &&  (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "4px",
                                    background: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 1000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Seuil minimum pour afficher vers le haut : besoin de beaucoup d'espace en haut
                                  const minimumSpaceAbove = menuHeight + margin + 100; // Marge très importante
                                  
                                  // Réinitialiser tous les styles de positionnement d'abord
                                  el.style.removeProperty('top');
                                  el.style.removeProperty('bottom');
                                  el.style.removeProperty('margin-top');
                                  el.style.removeProperty('margin-bottom');
                                  
                                  // Afficher vers le haut UNIQUEMENT si:
                                  // 1. Il n'y a vraiment PAS assez d'espace en bas
                                  // 2. ET il y a BEAUCOUP d'espace en haut (au moins 320px = menu + margin + 100px de sécurité)
                                  // Cette condition très stricte évite le découpage du menu
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    el.style.bottom = "100%";
                                    el.style.top = "auto";
                                    el.style.marginBottom = `${margin}px`;
                                    el.style.marginTop = "0";
                                  } else {
                                    // TOUJOURS afficher vers le bas si la condition n'est pas remplie
                                    // Même si cela dépasse un peu, c'est mieux qu'un menu coupé
                                    el.style.top = "100%";
                                    el.style.bottom = "auto";
                                    el.style.marginTop = `${margin}px`;
                                    el.style.marginBottom = "0";
                                  }
                                }
                              }
                            }}
                          >
                                  <button
                                    onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                                    disabled={loading}
                                    style={{ 
                                      width: "100%", 
                                      padding: "10px 12px", 
                                      background: "transparent", 
                                      border: "none", 
                                      textAlign: "left", 
                                      cursor: "pointer",
                                      color: "#111827",
                                      fontSize: "14px",
                                      display: "block",
                                      whiteSpace: "nowrap"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Voir détails
                                  </button>
                                  <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                  <button
                                    onClick={() => { handleClose(t.id); setOpenActionsMenuFor(null); }}
                                    disabled={loading}
                                    style={{ 
                                      width: "100%", 
                                      padding: "10px 12px", 
                                      background: "transparent", 
                                      border: "none", 
                                      textAlign: "left", 
                                      cursor: loading ? "not-allowed" : "pointer",
                                      color: "#111827",
                                      fontSize: "14px",
                                      display: "block",
                                      whiteSpace: "nowrap",
                                      opacity: loading ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!loading) {
                                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Clôturer
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : t.status === "rejete" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  
                                  const isOpen = openActionsMenuFor === t.id;
                                  if (isOpen) {
                                    setOpenActionsMenuFor(null);
(null);
                                    return;
                                  }

                                  const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuWidth = 220;
                                  const menuHeight = 120;

                                  let top = buttonRect.bottom + 4;
                                  if (viewportHeight - buttonRect.bottom < menuHeight && buttonRect.top > menuHeight) {
                                    top = buttonRect.top - menuHeight - 4;
                                  }

                                  let left = buttonRect.right - menuWidth;
                                  if (left < 8) left = 8;

({ top, left });
                                  setOpenActionsMenuFor(t.id);
                                }}
                                disabled={loading}
                                title="Actions"
                                aria-label="Actions"
                                style={{
                                  width: 28,
                                  height: 28,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "transparent",
                                  border: "none",
                                  borderRadius: 0,
                                  cursor: "pointer",
                                  color: "#475569",
                                  backgroundImage:
                                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='5' r='2' fill='%23475569'/><circle cx='12' cy='12' r='2' fill='%23475569'/><circle cx='12' cy='19' r='2' fill='%23475569'/></svg>\")",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "center",
                                  backgroundSize: "18px 18px"
                                }}
                              />
                              {openActionsMenuFor === t.id &&  (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    right: 0,
                                    marginTop: "4px",
                                    background: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 8,
                                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              minWidth: 160,
                              zIndex: 1000,
                              overflow: "visible"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            ref={(el) => {
                              if (el) {
                                const button = el.previousElementSibling as HTMLElement;
                                if (button) {
                                  const rect = button.getBoundingClientRect();
                                  const viewportHeight = window.innerHeight;
                                  const menuHeight = 220; // Hauteur approximative du menu (3-4 options)
                                  const margin = 4;
                                  const spaceBelow = viewportHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // Seuil minimum pour afficher vers le haut : besoin de beaucoup d'espace en haut
                                  const minimumSpaceAbove = menuHeight + margin + 100; // Marge très importante
                                  
                                  // Réinitialiser tous les styles de positionnement d'abord
                                  el.style.removeProperty('top');
                                  el.style.removeProperty('bottom');
                                  el.style.removeProperty('margin-top');
                                  el.style.removeProperty('margin-bottom');
                                  
                                  // Afficher vers le haut UNIQUEMENT si:
                                  // 1. Il n'y a vraiment PAS assez d'espace en bas
                                  // 2. ET il y a BEAUCOUP d'espace en haut (au moins 320px = menu + margin + 100px de sécurité)
                                  // Cette condition très stricte évite le découpage du menu
                                  const canShowUp = spaceBelow < (menuHeight + margin) && spaceAbove >= minimumSpaceAbove;
                                  
                                  if (canShowUp) {
                                    el.style.bottom = "100%";
                                    el.style.top = "auto";
                                    el.style.marginBottom = `${margin}px`;
                                    el.style.marginTop = "0";
                                  } else {
                                    // TOUJOURS afficher vers le bas si la condition n'est pas remplie
                                    // Même si cela dépasse un peu, c'est mieux qu'un menu coupé
                                    el.style.top = "100%";
                                    el.style.bottom = "auto";
                                    el.style.marginTop = `${margin}px`;
                                    el.style.marginBottom = "0";
                                  }
                                }
                              }
                            }}
                          >
                                  <button
                                    onClick={() => { loadTicketDetails(t.id); setOpenActionsMenuFor(null); }}
                                    disabled={loading}
                                    style={{ 
                                      width: "100%", 
                                      padding: "10px 12px", 
                                      background: "transparent", 
                                      border: "none", 
                                      textAlign: "left", 
                                      cursor: "pointer",
                                      color: "#111827",
                                      fontSize: "14px",
                                      display: "block",
                                      whiteSpace: "nowrap"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Voir détails
                                  </button>
                                  <div style={{ borderTop: "1px solid #e5e7eb" }}></div>
                                  <button
                                    onClick={() => { handleReopenClick(t.id); setOpenActionsMenuFor(null); }}
                                    disabled={loading}
                                    style={{ 
                                      width: "100%", 
                                      padding: "10px 12px", 
                                      background: "transparent", 
                                      border: "none", 
                                      textAlign: "left", 
                                      cursor: loading ? "not-allowed" : "pointer",
                                      color: "#111827",
                                      fontSize: "14px",
                                      display: "block",
                                      whiteSpace: "nowrap",
                                      opacity: loading ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!loading) {
                                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    Réouvrir
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#999", fontSize: "12px" }}>
                              {t.status === "cloture" ? "Clôturé" : "N/A"}
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
      </table>
    </>
  )}

      {viewTicketDetails && ticketDetails && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "24px",
            borderRadius: "8px",
            maxWidth: "700px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginBottom: "16px" }}>Détails du ticket #{ticketDetails.number}</h3>
            <div style={{ marginBottom: "16px" }}>
              <strong>Titre :</strong>
              <p style={{ marginTop: "4px", padding: "8px", background: "#f8f9fa", borderRadius: "4px" }}>
                {ticketDetails.title}
              </p>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <strong>Description :</strong>
              <p style={{ marginTop: "4px", padding: "8px", background: "#f8f9fa", borderRadius: "4px", whiteSpace: "pre-wrap" }}>
                {ticketDetails.description || ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
              <div>
                <strong>Priorité :</strong>
                <span style={{
                  marginLeft: "8px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  background: ticketDetails.priority === "critique" ? "#f44336" : ticketDetails.priority === "haute" ? "#fed7aa" : ticketDetails.priority === "moyenne" ? "#E3F2FD" : ticketDetails.priority === "faible" ? "#fee2e2" : "#9e9e9e",
                  color: ticketDetails.priority === "haute" ? "#92400e" : ticketDetails.priority === "faible" ? "#991b1b" : ticketDetails.priority === "moyenne" ? "#1565C0" : "white"
                }}>
                  {ticketDetails.priority}
                </span>
              </div>
              {ticketDetails.creator && (
                <div>
                  <strong>Créateur :</strong>
                  <span style={{ marginLeft: "8px" }}>
                    {ticketDetails.creator.full_name}
                  </span>
                </div>
              )}
            </div>
            <div style={{ marginTop: "16px" }}>
              <strong>Historique :</strong>
              <div style={{ marginTop: "8px" }}>
                {ticketHistory.length === 0 ? (
                  <p style={{ color: "#999", fontStyle: "italic" }}>Aucun historique</p>
                ) : (
                  ticketHistory.map((h) => (
                    <div key={h.id} style={{ padding: "8px", marginTop: "4px", background: "#f8f9fa", borderRadius: "4px" }}>
                      <div style={{ fontSize: "12px", color: "#555" }}>
                        {new Date(h.changed_at).toLocaleString("fr-FR")}
                      </div>
                      <div style={{ marginTop: "4px", fontWeight: 500 }}>
                        {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                      </div>
                      {h.reason && (
                        <div style={{ marginTop: "4px", color: "#666" }}>{h.reason}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                onClick={() => setViewTicketDetails(null)}
                style={{ padding: "8px 12px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

          {activeSection === "reports" && (roleName === "Adjoint DSI" || roleName === "DSI" || roleName === "Admin") && (
            <>
              <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>Rapports</h2>
              
              {!selectedReport && !showGenerateReport && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <div style={{ marginBottom: "32px" }}>
                    <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600" }}>
                      <span style={{ color: "#dc3545" }}>Types</span>{" "}
                      <span style={{ color: "#000" }}>de</span>{" "}
                      <span style={{ color: "#dc3545" }}>Rapports</span> :
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          padding: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setSelectedReport("performance")}
                      >
                        <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#007bff" strokeWidth="1.5">
                            <path d="M2 2v8h8" />
                          </svg>
                        </div>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="4" y="14" width="3" height="6" fill="#007bff" />
                            <rect x="9" y="10" width="3" height="10" fill="#28a745" />
                            <rect x="14" y="6" width="3" height="14" fill="#28a745" />
                          </svg>
                        </div>
                        <span style={{ fontSize: "16px" }}>
                          <span style={{ color: "#dc3545" }}>Rapports</span>{" "}
                          <span style={{ color: "#000" }}>de</span>{" "}
                          <span style={{ color: "#dc3545" }}>Performance</span>
                        </span>
                      </div>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          padding: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setSelectedReport("utilisateurs")}
                      >
                        <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#007bff" strokeWidth="1.5">
                            <path d="M2 2v8h8" />
                          </svg>
                        </div>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <span style={{ fontSize: "16px", color: "#dc3545" }}>Rapports Utilisateurs</span>
                      </div>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          padding: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setSelectedReport("tickets")}
                      >
                        <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#007bff" strokeWidth="1.5">
                            <path d="M2 2v8h8" />
                          </svg>
                        </div>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffc107" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="16" rx="2" fill="none" />
                            <path d="M3 8h18" />
                            <path d="M8 12h8" />
                          </svg>
                        </div>
                        <span style={{ fontSize: "16px", color: "#dc3545" }}>Rapports Tickets</span>
                      </div>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          padding: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setSelectedReport("techniciens")}
                      >
                        <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#007bff" strokeWidth="1.5">
                            <path d="M2 2v8h8" />
                          </svg>
                        </div>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc3545" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="20" x2="21" y2="20" />
                            <line x1="3" y1="20" x2="3" y2="4" />
                            <polyline points="4 16 8 12 12 8 16 6 20 4" stroke="#dc3545" fill="none" />
                          </svg>
                        </div>
                        <span style={{ fontSize: "16px", color: "#dc3545" }}>Rapports Techniciens</span>
                      </div>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          padding: "12px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={() => setSelectedReport("audit")}
                      >
                        <div style={{ width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: "#007bff" }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#007bff" strokeWidth="1.5">
                            <path d="M2 2v8h8" />
                          </svg>
                        </div>
                        <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "#6c757d" }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                        </div>
                        <span style={{ fontSize: "16px" }}>
                          <span style={{ color: "#dc3545" }}>Audit</span>{" "}
                          <span style={{ color: "#000" }}>et</span>{" "}
                          <span style={{ color: "#dc3545" }}>Logs</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600", color: "#333" }}>
                      <span style={{ color: "#dc3545" }}>Rapports</span>{" "}
                      <span style={{ color: "#dc3545" }}>Récents</span> :
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                          <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#333" }}>Rapport</th>
                          <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#333" }}>Généré par</th>
                          <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#333" }}>Date</th>
                          <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#333" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentReports.length > 0 ? (
                          recentReports.map((report) => (
                            <tr key={report.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                              <td style={{ padding: "12px" }}>
                                <span style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}>{report.name}</span>
                              </td>
                              <td style={{ padding: "12px", color: "#333" }}>{report.generated_by}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}>{report.date}</span>
                              </td>
                              <td style={{ padding: "12px" }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <button 
                                    onClick={() => {
                                      // Voir le rapport
                                      console.log("Voir rapport:", report.id);
                                    }}
                                    style={{ 
                                      padding: "6px 10px", 
                                      backgroundColor: "transparent", 
                                      color: "#007bff", 
                                      border: "none", 
                                      borderRadius: "4px", 
                                      cursor: "pointer",
                                      fontSize: "16px"
                                    }}
                                    title="Voir"
                                  >
                                    👁️
                                  </button>
                                  <button 
                                    onClick={() => {
                                      // Télécharger le rapport
                                      console.log("Télécharger rapport:", report.id);
                                    }}
                                    style={{ 
                                      padding: "6px 10px", 
                                      backgroundColor: "transparent", 
                                      color: "#007bff", 
                                      border: "none", 
                                      borderRadius: "4px", 
                                      cursor: "pointer",
                                      fontSize: "16px"
                                    }}
                                    title="Télécharger"
                                  >
                                    ⬇️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ padding: "12px", color: "#666", textAlign: "center" }}>
                              Aucun rapport récent
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: "32px", textAlign: "left" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Bouton cliqué - ouverture du formulaire");
                        console.log("showGenerateReport avant:", showGenerateReport);
                        console.log("showOutputFormat avant:", showOutputFormat);
                        // Forcer le re-render en utilisant une fonction de callback
                        setShowGenerateReport((prev) => {
                          console.log("setShowGenerateReport appelé, prev:", prev);
                          return true;
                        });
                        setShowOutputFormat(false);
                        setSelectedReport("");
                        console.log("showGenerateReport devrait être true maintenant");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#333",
                        fontSize: "16px",
                        cursor: "pointer",
                        padding: "8px 0",
                        fontWeight: "500"
                      }}
                    >
                      [+ Générer un nouveau rapport]
                    </button>
                  </div>
                </div>
              )}

              {/* Formulaire de génération de rapport */}
              {showGenerateReport && !showOutputFormat && (
                <div key="generate-report-form" style={{ background: "white", padding: "32px", borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.15)", marginTop: "24px", zIndex: 1000, position: "relative", width: "100%", minHeight: "200px", border: "2px solid #007bff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e3a5f", margin: 0, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "1px" }}>GÉNÉRER UN RAPPORT</h2>
                    <button
                      onClick={() => {
                        setShowGenerateReport(false);
                        setShowOutputFormat(false);
                        setReportType("");
                        setReportPeriodFrom("2024-01-01");
                        setReportPeriodTo("2024-01-31");
                        setReportFilters({ department: "all", technician: "all", ticketType: "all", priority: "all" });
                        setOutputFormat("");
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "transparent",
                        color: "#1e3a5f",
                        border: "1px solid #1e3a5f",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500"
                      }}
                    >
                      ✕ Fermer
                    </button>
                  </div>
                  <div style={{ marginBottom: "32px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a5f", marginBottom: "20px", fontFamily: "monospace" }}>Type de Rapport *</h3>
                    <div style={{ 
                      border: "1px solid #007bff", 
                      borderLeft: "3px solid #007bff",
                      borderTop: "1px solid #007bff",
                      borderRadius: "0 4px 4px 0",
                      padding: "16px",
                      position: "relative",
                      backgroundColor: "#f8f9fa"
                    }}>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "16px",
                          color: "#333",
                          backgroundColor: "white"
                        }}
                      >
                        <option value="">[Sélectionner un type ▼]</option>
                        <option value="performance">Performance Globale</option>
                        <option value="tickets_department">Tickets par Département</option>
                        <option value="technicians">Performance des Techniciens</option>
                        <option value="satisfaction">Satisfaction Utilisateurs</option>
                        <option value="recurrent">Problèmes Récurrents</option>
                        <option value="audit">Audit et Logs</option>
                      </select>
                      <div style={{ marginTop: "16px", paddingLeft: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <span style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Performance Globale</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <span style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Tickets par Département</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <span style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Performance des Techniciens</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <span style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Satisfaction Utilisateurs</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <span style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Problèmes Récurrents</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <span style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Audit et Logs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "32px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a5f", marginBottom: "20px", fontFamily: "monospace" }}>Période *</h3>
                    <div style={{ 
                      border: "1px solid #007bff", 
                      borderLeft: "3px solid #007bff",
                      borderTop: "1px solid #007bff",
                      borderRadius: "0 4px 4px 0",
                      padding: "16px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: "8px", color: "#1e3a5f", fontSize: "16px" }}>Du :</label>
                          <input
                            type="date"
                            value={reportPeriodFrom}
                            onChange={(e) => setReportPeriodFrom(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "16px",
                              color: "#333"
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", marginBottom: "8px", color: "#1e3a5f", fontSize: "16px" }}>Au :</label>
                          <input
                            type="date"
                            value={reportPeriodTo}
                            onChange={(e) => setReportPeriodTo(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px",
                              border: "1px solid #ddd",
                              borderRadius: "4px",
                              fontSize: "16px",
                              color: "#333"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "32px" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a5f", marginBottom: "20px", fontFamily: "monospace" }}>Filtres (Optionnel)</h3>
                    <div style={{ 
                      border: "1px solid #007bff", 
                      borderLeft: "3px solid #007bff",
                      borderTop: "1px solid #007bff",
                      borderRadius: "0 4px 4px 0",
                      padding: "16px",
                      backgroundColor: "#f8f9fa"
                    }}>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <label style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Département :</label>
                        </div>
                        <select
                          value={reportFilters.department}
                          onChange={(e) => setReportFilters({...reportFilters, department: e.target.value})}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "16px",
                            color: "#333",
                            backgroundColor: "white"
                          }}
                        >
                          <option value="all">Tous</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <label style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Technicien :</label>
                        </div>
                        <select
                          value={reportFilters.technician}
                          onChange={(e) => setReportFilters({...reportFilters, technician: e.target.value})}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "16px",
                            color: "#333",
                            backgroundColor: "white"
                          }}
                        >
                          <option value="all">Tous</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>{tech.full_name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <label style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Type de Ticket :</label>
                        </div>
                        <select
                          value={reportFilters.ticketType}
                          onChange={(e) => setReportFilters({...reportFilters, ticketType: e.target.value})}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "16px",
                            color: "#333",
                            backgroundColor: "white"
                          }}
                        >
                          <option value="all">Tous</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                          <label style={{ color: "#1e3a5f", fontSize: "16px", fontFamily: "monospace" }}>Priorité :</label>
                        </div>
                        <select
                          value={reportFilters.priority}
                          onChange={(e) => setReportFilters({...reportFilters, priority: e.target.value})}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "16px",
                            color: "#333",
                            backgroundColor: "white"
                          }}
                        >
                          <option value="all">Tous</option>
                          <option value="critique">Critique</option>
                          <option value="haute">Haute</option>
                          <option value="moyenne">Moyenne</option>
                          <option value="faible">Faible</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end", marginTop: "32px" }}>
                    <button
                      onClick={() => {
                        setShowGenerateReport(false);
                        setReportType("");
                        setReportPeriodFrom("2024-01-01");
                        setReportPeriodTo("2024-01-31");
                        setReportFilters({ department: "all", technician: "all", ticketType: "all", priority: "all" });
                      }}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "transparent",
                        color: "#1e3a5f",
                        border: "1px solid #1e3a5f",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "500"
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (reportType && reportPeriodFrom && reportPeriodTo) {
                          setShowOutputFormat(true);
                        }
                      }}
                      disabled={!reportType || !reportPeriodFrom || !reportPeriodTo}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: reportType && reportPeriodFrom && reportPeriodTo ? "#1e3a5f" : "#ccc",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: reportType && reportPeriodFrom && reportPeriodTo ? "pointer" : "not-allowed",
                        fontSize: "16px",
                        fontWeight: "500"
                      }}
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}

              {/* Format de Sortie */}
              {showGenerateReport && showOutputFormat && (
                <div style={{ background: "white", padding: "32px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", marginTop: "24px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#1e3a5f", marginBottom: "24px", fontFamily: "monospace" }}>Format de Sortie</h3>
                  <div style={{ 
                    border: "2px dashed #1e3a5f",
                    borderRadius: "4px",
                    padding: "24px"
                  }}>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                        <label style={{ color: "#1e3a5f", fontSize: "16px", cursor: "pointer", flex: 1, fontFamily: "monospace" }}>
                          <input
                            type="radio"
                            name="outputFormat"
                            value="pdf"
                            checked={outputFormat === "pdf"}
                            onChange={(e) => setOutputFormat(e.target.value)}
                            style={{ marginRight: "8px" }}
                          />
                          PDF
                        </label>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                        <label style={{ color: "#1e3a5f", fontSize: "16px", cursor: "pointer", flex: 1, fontFamily: "monospace" }}>
                          <input
                            type="radio"
                            name="outputFormat"
                            value="excel"
                            checked={outputFormat === "excel"}
                            onChange={(e) => setOutputFormat(e.target.value)}
                            style={{ marginRight: "8px" }}
                          />
                          Excel
                        </label>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                        <label style={{ color: "#1e3a5f", fontSize: "16px", cursor: "pointer", flex: 1, fontFamily: "monospace" }}>
                          <input
                            type="radio"
                            name="outputFormat"
                            value="csv"
                            checked={outputFormat === "csv"}
                            onChange={(e) => setOutputFormat(e.target.value)}
                            style={{ marginRight: "8px" }}
                          />
                          CSV
                        </label>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#1e3a5f", marginRight: "12px" }}></div>
                        <label style={{ color: "#1e3a5f", fontSize: "16px", cursor: "pointer", flex: 1, fontFamily: "monospace" }}>
                          <input
                            type="radio"
                            name="outputFormat"
                            value="screen"
                            checked={outputFormat === "screen"}
                            onChange={(e) => setOutputFormat(e.target.value)}
                            style={{ marginRight: "8px" }}
                          />
                          Afficher à l'écran
                        </label>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end", marginTop: "32px" }}>
                    <button
                      onClick={() => setShowOutputFormat(false)}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "transparent",
                        color: "#1e3a5f",
                        border: "1px solid #1e3a5f",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "500",
                        fontFamily: "monospace"
                      }}
                    >
                      [Annuler]
                    </button>
                    <button
                      onClick={() => {
                        // Générer le rapport
                        console.log("Génération du rapport:", { reportType, reportPeriodFrom, reportPeriodTo, reportFilters, outputFormat });
                        // Réinitialiser le formulaire
                        setShowGenerateReport(false);
                        setShowOutputFormat(false);
                        setReportType("");
                        setReportPeriodFrom("2024-01-01");
                        setReportPeriodTo("2024-01-31");
                        setReportFilters({ department: "all", technician: "all", ticketType: "all", priority: "all" });
                        setOutputFormat("");
                      }}
                      disabled={!outputFormat}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: outputFormat ? "#1e3a5f" : "#ccc",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: outputFormat ? "pointer" : "not-allowed",
                        fontSize: "16px",
                        fontWeight: "500",
                        fontFamily: "monospace"
                      }}
                    >
                      [Générer Rapport]
                    </button>
                  </div>
                </div>
              )}

              {selectedReport === "statistiques" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Statistiques générales</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#007bff", marginBottom: "8px" }}>{allTickets.length}</div>
                      <div style={{ color: "#666" }}>Nombre total de tickets</div>
                    </div>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745", marginBottom: "8px" }}>{resolvedCount + allTickets.filter((t) => t.status === "cloture").length}</div>
                      <div style={{ color: "#666" }}>Tickets résolus/clôturés</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Répartition par statut</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Statut</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Nombre</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Pourcentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: "12px" }}>En attente</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{pendingTickets.length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((pendingTickets.length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Assignés/En cours</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{assignedTickets.length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((assignedTickets.length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Résolus</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{resolvedCount}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((resolvedCount / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Clôturés</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.filter((t) => t.status === "cloture").length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((allTickets.filter((t) => t.status === "cloture").length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Rejetés</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.filter((t) => t.status === "rejete").length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((allTickets.filter((t) => t.status === "rejete").length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Répartition par priorité</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Priorité</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Nombre</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Pourcentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {["critique", "haute", "moyenne", "faible"].map((priority) => {
                          const count = allTickets.filter((t) => t.priority === priority).length;
                          return (
                            <tr key={priority}>
                              <td style={{ padding: "12px", textTransform: "capitalize" }}>{priority}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{count}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((count / allTickets.length) * 100).toFixed(1) : 0}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => exportToPDF()}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel()}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}

              {selectedReport === "metriques" && (() => {
                // Calculer les métriques avec des données RÉELLES
                const resolvedTickets = allTickets.filter((t) => t.status === "resolu" || t.status === "cloture");
                const rejectedTickets = allTickets.filter((t) => t.status === "rejete");
                const escalatedTickets = allTickets.filter((t) => t.priority === "critique" && (t.status === "en_attente_analyse" || t.status === "assigne_technicien" || t.status === "en_cours"));
                const reopenedTickets = rejectedTickets.filter(() => {
                  // Tickets qui ont été rejetés puis rouverts (simplifié - on vérifie s'il y a des tickets rejetés)
                  return true; // Pour l'instant, on compte tous les rejetés comme potentiellement rouverts
                });
                
                // Calculer le temps moyen de résolution RÉEL basé sur les dates
                let totalResolutionTime = 0;
                let resolvedCountWithDates = 0;
                resolvedTickets.forEach((ticket) => {
                  if (ticket.created_at) {
                    let resolvedDate: Date | null = null;
                    if (ticket.status === "cloture" && ticket.closed_at) {
                      resolvedDate = new Date(ticket.closed_at);
                    } else if (ticket.status === "resolu" && ticket.resolved_at) {
                      resolvedDate = new Date(ticket.resolved_at);
                    }
                    
                    if (resolvedDate) {
                      const created = new Date(ticket.created_at);
                      const diffDays = Math.floor((resolvedDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays >= 0) {
                        totalResolutionTime += diffDays;
                        resolvedCountWithDates++;
                      }
                    }
                  }
                });
                const avgResolutionDays = resolvedCountWithDates > 0 ? Math.round(totalResolutionTime / resolvedCountWithDates) : 0;
                
                // Calculer le taux de satisfaction RÉEL basé sur les feedback_score
                const ticketsWithFeedback = resolvedTickets.filter((t) => t.feedback_score !== null && t.feedback_score !== undefined && t.feedback_score > 0);
                let satisfactionRate = "0";
                if (ticketsWithFeedback.length > 0) {
                  const avgFeedback = ticketsWithFeedback.reduce((sum, t) => sum + (t.feedback_score || 0), 0) / ticketsWithFeedback.length;
                  satisfactionRate = ((avgFeedback / 5) * 100).toFixed(1);
                } else if (resolvedTickets.length > 0) {
                  // Si pas de feedback, utiliser le taux de résolution comme indicateur
                  const resolvedCount = resolvedTickets.length;
                  const rejectedCount = rejectedTickets.length;
                  const baseDenominator = resolvedCount + rejectedCount;
                  satisfactionRate = baseDenominator > 0 ? ((resolvedCount / baseDenominator) * 100).toFixed(1) : "0";
                }
                
                // Calculer le taux de résolution RÉEL
                const totalTicketsCount = allTickets.length;
                const resolvedOrClosedCount = resolvedTickets.length;
                const resolutionRate = totalTicketsCount > 0 ? `${Math.round((resolvedOrClosedCount / totalTicketsCount) * 100)}%` : "0%";
                
                // Taux de réouverture
                const reopenRate = rejectedTickets.length > 0 ? ((reopenedTickets.length / rejectedTickets.length) * 100).toFixed(1) : "0";
                
                return (
                  <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Métriques de performance</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800", marginBottom: "8px" }}>{avgResolutionDays} jours</div>
                        <div style={{ color: "#666" }}>Temps moyen de résolution</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4caf50", marginBottom: "8px" }}>{satisfactionRate}%</div>
                        <div style={{ color: "#666" }}>Taux de satisfaction utilisateur</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2196f3", marginBottom: "8px" }}>{resolutionRate}</div>
                        <div style={{ color: "#666" }}>Taux de résolution</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc3545", marginBottom: "8px" }}>{escalatedTickets.length}</div>
                        <div style={{ color: "#666" }}>Tickets escaladés</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#17a2b8", marginBottom: "8px" }}>{reopenRate}%</div>
                        <div style={{ color: "#666" }}>Taux de réouverture</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Détails</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Métrique</th>
                            <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Valeur</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: "12px" }}>Tickets résolus/clôturés</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{resolvedTickets.length}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "12px" }}>Tickets rejetés</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{rejectedTickets.length}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "12px" }}>Tickets escaladés (critiques en cours)</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{escalatedTickets.length}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "12px" }}>Tickets satisfaisants (implicite)</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{resolvedTickets.length}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                      <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                      <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                    </div>
                  </div>
                );
              })()}

              {selectedReport === "agence" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Analyses par agence</h3>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Volume de tickets par agence</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Agence</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Nombre de tickets</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Temps moyen</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Satisfaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(allTickets.map((t) => t.creator?.agency || t.user_agency).filter(Boolean))).map((agency) => {
                          const agencyTickets = allTickets.filter((t) => (t.creator?.agency || t.user_agency) === agency);
                          const agencyResolved = agencyTickets.filter((t) => t.status === "resolu" || t.status === "cloture").length;
                          const agencyRejected = agencyTickets.filter((t) => t.status === "rejete").length;
                          const agencyDenominator = agencyResolved + agencyRejected;
                          const agencySatisfaction = agencyDenominator > 0 ? ((agencyResolved / agencyDenominator) * 100).toFixed(1) : "0";
                          return (
                            <tr key={agency}>
                              <td style={{ padding: "12px" }}>{agency}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{agencyTickets.length}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>N/A</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{agencySatisfaction}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => exportToPDF()}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel()}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}

              {selectedReport === "technicien" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Analyses par technicien</h3>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Performance des techniciens</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Technicien</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Tickets traités</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Temps moyen</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Charge actuelle</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Satisfaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicians.map((tech) => {
                          const techTickets = allTickets.filter((t) => t.technician_id === tech.id);
                          const inProgress = techTickets.filter((t) => t.status === "assigne_technicien" || t.status === "en_cours").length;
                          const techResolved = techTickets.filter((t) => t.status === "resolu" || t.status === "cloture").length;
                          const techRejected = techTickets.filter((t) => t.status === "rejete").length;
                          const techDenominator = techResolved + techRejected;
                          const techSatisfaction = techDenominator > 0 ? ((techResolved / techDenominator) * 100).toFixed(1) : "0";
                          return (
                            <tr key={tech.id}>
                              <td style={{ padding: "12px" }}>{tech.full_name}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{techResolved}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>N/A</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{inProgress}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{techSatisfaction}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => exportToPDF()}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel()}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}

              {selectedReport === "evolutions" && (() => {
                // Calculer les évolutions par période
                const now = new Date();
                const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                
                // Tickets créés cette semaine
                const ticketsThisWeek = allTickets.filter((t: any) => {
                  const createdDate = new Date(t.created_at);
                  return createdDate >= lastWeek;
                });
                
                // Tickets créés ce mois
                const ticketsThisMonth = allTickets.filter((t: any) => {
                  const createdDate = new Date(t.created_at);
                  return createdDate >= lastMonth;
                });
                
                // Tickets créés le mois dernier
                const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                const ticketsLastMonth = allTickets.filter((t: any) => {
                  const createdDate = new Date(t.created_at);
                  return createdDate >= lastMonthStart && createdDate < lastMonth;
                });
                
                // Tendances
                const trendThisWeek = ticketsThisWeek.length;
                const trendLastMonth = ticketsLastMonth.length;
                const trendChange = trendLastMonth > 0 ? (((trendThisWeek - trendLastMonth) / trendLastMonth) * 100).toFixed(1) : "0";
                const isIncreasing = parseFloat(trendChange) > 0;
                
                // Grouper par jour de la semaine
                const ticketsByDay: { [key: string]: number } = {};
                allTickets.forEach((t: any) => {
                  const date = new Date(t.created_at);
                  const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });
                  ticketsByDay[dayName] = (ticketsByDay[dayName] || 0) + 1;
                });
                
                // Trouver le jour le plus chargé
                const busiestDay = Object.entries(ticketsByDay).reduce((a, b) => 
                  ticketsByDay[a[0]] > ticketsByDay[b[0]] ? a : b, 
                  ["", 0] as [string, number]
                );
                
                return (
                  <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Évolutions dans le temps</h3>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px" }}>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#007bff", marginBottom: "8px" }}>{ticketsThisWeek.length}</div>
                        <div style={{ color: "#666" }}>Tickets cette semaine</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745", marginBottom: "8px" }}>{ticketsThisMonth.length}</div>
                        <div style={{ color: "#666" }}>Tickets ce mois</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: isIncreasing ? "#dc3545" : "#28a745", marginBottom: "8px" }}>
                          {isIncreasing ? "↑" : "↓"} {Math.abs(parseFloat(trendChange))}%
                        </div>
                        <div style={{ color: "#666" }}>Tendance</div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Répartition par jour de la semaine</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Jour</th>
                            <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Nombre de tickets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(ticketsByDay)
                            .sort((a, b) => b[1] - a[1])
                            .map(([day, count]) => (
                              <tr key={day}>
                                <td style={{ padding: "12px", textTransform: "capitalize" }}>{day}</td>
                                <td style={{ padding: "12px", textAlign: "right" }}>{count}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Pics d'activité</h4>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <p style={{ margin: 0, color: "#666" }}>
                          <strong>Jour le plus chargé :</strong> {busiestDay[0] ? `${busiestDay[0]} (${busiestDay[1]} tickets)` : "Aucune donnée"}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: "24px" }}>
                      <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Performance par période</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa" }}>
                            <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Période</th>
                            <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Tickets créés</th>
                            <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Tickets résolus</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: "12px" }}>Cette semaine</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{ticketsThisWeek.length}</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              {ticketsThisWeek.filter((t: any) => t.status === "resolu" || t.status === "cloture").length}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "12px" }}>Ce mois</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{ticketsThisMonth.length}</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              {ticketsThisMonth.filter((t: any) => t.status === "resolu" || t.status === "cloture").length}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: "12px" }}>Mois dernier</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>{ticketsLastMonth.length}</td>
                            <td style={{ padding: "12px", textAlign: "right" }}>
                              {ticketsLastMonth.filter((t: any) => t.status === "resolu" || t.status === "cloture").length}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                      <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                      <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                    </div>
                  </div>
                );
              })()}

              {selectedReport === "recurrents" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Problèmes récurrents</h3>
                  
                  {/* Problèmes les plus fréquents */}
                  <div style={{ marginBottom: "32px" }}>
                    <h4 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>•</span> Problèmes les plus fréquents
                    </h4>
                    <div style={{ background: "#f8f9fa", padding: "16px", borderRadius: "8px" }}>
                      {getMostFrequentProblems().length > 0 ? (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {getMostFrequentProblems().map((problem, index) => (
                            <li key={index} style={{ 
                              padding: "12px", 
                              borderBottom: index < getMostFrequentProblems().length - 1 ? "1px solid #dee2e6" : "none",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}>
                              <span style={{ color: "#333", fontSize: "14px", fontWeight: "600" }}>{problem.problème}</span>
                              <span style={{ 
                                color: "#666", 
                                fontSize: "14px", 
                                fontWeight: "600",
                                background: "#e3f2fd",
                                padding: "4px 12px",
                                borderRadius: "12px"
                              }}>
                                {problem.occurrences} occurrence{problem.occurrences > 1 ? 's' : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "#999", fontSize: "14px", margin: 0, textAlign: "center", padding: "20px" }}>
                          Aucun problème récurrent identifié
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Historique des problèmes */}
                  <div style={{ marginBottom: "32px" }}>
                    <h4 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>•</span> Historique des problèmes
                    </h4>
                    <div style={{ background: "#f8f9fa", padding: "16px", borderRadius: "8px" }}>
                      {getRecurringTicketsHistory().length > 0 ? (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "transparent" }}>
                              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontSize: "12px", fontWeight: "600", color: "#666" }}>Problème</th>
                              <th style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #dee2e6", fontSize: "12px", fontWeight: "600", color: "#666" }}>Occurrences</th>
                              <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6", fontSize: "12px", fontWeight: "600", color: "#666" }}>Dernière occurrence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getRecurringTicketsHistory().map((item, index) => (
                              <tr key={index} style={{ borderBottom: index < getRecurringTicketsHistory().length - 1 ? "1px solid #dee2e6" : "none" }}>
                                <td style={{ padding: "12px", color: "#333", fontSize: "14px" }}>{item.titre}</td>
                                <td style={{ padding: "12px", textAlign: "center" }}>
                                  <span style={{ 
                                    background: "#e3f2fd", 
                                    color: "#1976d2",
                                    padding: "4px 12px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600"
                                  }}>
                                    {item.occurrences}
                                  </span>
                                </td>
                                <td style={{ padding: "12px", textAlign: "right", color: "#666", fontSize: "14px" }}>
                                  {item.dernier ? new Date(item.dernier).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ color: "#999", fontSize: "14px", margin: 0, textAlign: "center", padding: "20px" }}>
                          Aucun problème récurrent dans l'historique
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Agences avec le plus de tickets</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Agence</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Nombre de tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(allTickets.map((t) => t.creator?.agency || t.user_agency).filter(Boolean)))
                          .map((agency) => ({
                            agency,
                            count: allTickets.filter((t) => (t.creator?.agency || t.user_agency) === agency).length
                          }))
                          .sort((a, b) => b.count - a.count)
                          .slice(0, 5)
                          .map(({ agency, count }) => (
                            <tr key={agency}>
                              <td style={{ padding: "12px" }}>{agency}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => viewDetailedReport("Problèmes récurrents")}
                      style={{ padding: "10px 20px", backgroundColor: "#1e3a5f", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500" }}
                    >
                      Voir Rapport
                    </button>
                    <button 
                      onClick={() => exportToPDF("Problèmes récurrents")}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel("Problèmes récurrents")}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}

              {/* Nouveaux types de rapports */}
              {selectedReport === "performance" && (
                <>
                  {(() => {
                    // Utiliser le même contenu que "metriques"
                    const resolvedTickets = allTickets.filter((t) => t.status === "resolu" || t.status === "cloture");
                    const rejectedTickets = allTickets.filter((t) => t.status === "rejete");
                    const escalatedTickets = allTickets.filter((t) => t.priority === "critique" && (t.status === "en_attente_analyse" || t.status === "assigne_technicien" || t.status === "en_cours"));
                    const reopenedTickets = rejectedTickets.filter(() => true);
                    const avgResolutionDays = resolvedTickets.length > 0 ? Math.round(resolvedTickets.length / 2) : 0;
                    const resolvedCount = resolvedTickets.length;
                    const rejectedCount = rejectedTickets.length;
                    const baseDenominator = resolvedCount + rejectedCount;
                    const satisfactionRate = baseDenominator > 0 ? ((resolvedCount / baseDenominator) * 100).toFixed(1) : "0";
                    const reopenRate = rejectedTickets.length > 0 ? ((reopenedTickets.length / rejectedTickets.length) * 100).toFixed(1) : "0";
                    
                    return (
                      <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                          <h3 style={{ fontSize: "22px", fontWeight: "600", color: "#333" }}>Rapports de Performance</h3>
                          <button 
                            style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            onClick={() => setSelectedReport("")}
                          >
                            Retour
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                          <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800", marginBottom: "8px" }}>{avgResolutionDays} jours</div>
                            <div style={{ color: "#666" }}>Temps moyen de résolution</div>
                          </div>
                          <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4caf50", marginBottom: "8px" }}>{satisfactionRate}%</div>
                            <div style={{ color: "#666" }}>Taux de satisfaction utilisateur</div>
                          </div>
                          <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc3545", marginBottom: "8px" }}>{escalatedTickets.length}</div>
                            <div style={{ color: "#666" }}>Tickets escaladés</div>
                          </div>
                          <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#17a2b8", marginBottom: "8px" }}>{reopenRate}%</div>
                            <div style={{ color: "#666" }}>Taux de réouverture</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                          <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                          <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {selectedReport === "tickets" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "22px", fontWeight: "600", color: "#333" }}>Rapports Tickets</h3>
                    <button 
                      style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      onClick={() => setSelectedReport("")}
                    >
                      Retour
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#007bff", marginBottom: "8px" }}>{allTickets.length}</div>
                      <div style={{ color: "#666" }}>Nombre total de tickets</div>
                    </div>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745", marginBottom: "8px" }}>{resolvedCount + allTickets.filter((t) => t.status === "cloture").length}</div>
                      <div style={{ color: "#666" }}>Tickets résolus/clôturés</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Répartition par statut</h4>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Statut</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Nombre</th>
                          <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Pourcentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: "12px" }}>En attente</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{pendingTickets.length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((pendingTickets.length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Assignés/En cours</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{assignedTickets.length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((assignedTickets.length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Résolus</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{resolvedCount}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((resolvedCount / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Clôturés</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.filter((t) => t.status === "cloture").length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((allTickets.filter((t) => t.status === "cloture").length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Rejetés</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.filter((t) => t.status === "rejete").length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((allTickets.filter((t) => t.status === "rejete").length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => exportToPDF()}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel()}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}

              {selectedReport === "techniciens" && (
                <>
                  {(() => {
                    // Utiliser le même contenu que "technicien"
                    return (
                      <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                          <h3 style={{ fontSize: "22px", fontWeight: "600", color: "#333" }}>Rapports Techniciens</h3>
                          <button 
                            style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            onClick={() => setSelectedReport("")}
                          >
                            Retour
                          </button>
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                          <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Performance par technicien</h4>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "#f8f9fa" }}>
                                <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Technicien</th>
                                <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>Tickets assignés</th>
                                <th style={{ padding: "12px", textAlign: "right", borderBottom: "1px solid #dee2e6" }}>En cours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {technicians.map((tech) => (
                                <tr key={tech.id}>
                                  <td style={{ padding: "12px" }}>{tech.full_name}</td>
                                  <td style={{ padding: "12px", textAlign: "right" }}>{tech.assigned_tickets_count || 0}</td>
                                  <td style={{ padding: "12px", textAlign: "right" }}>{tech.in_progress_tickets_count || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                          <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                          <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {selectedReport === "utilisateurs" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "22px", fontWeight: "600", color: "#333" }}>Rapports Utilisateurs</h3>
                    <button 
                      style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      onClick={() => setSelectedReport("")}
                    >
                      Retour
                    </button>
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Statistiques utilisateurs</h4>
                    <p style={{ color: "#666", marginBottom: "20px" }}>Rapport des utilisateurs et de leur activité</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#007bff", marginBottom: "8px" }}>
                          {Array.from(new Set(allTickets.map((t) => t.creator_id))).length}
                        </div>
                        <div style={{ color: "#666" }}>Utilisateurs actifs</div>
                      </div>
                      <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745", marginBottom: "8px" }}>
                          {allTickets.length}
                        </div>
                        <div style={{ color: "#666" }}>Tickets créés</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => exportToPDF()}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel()}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}

              {selectedReport === "audit" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "22px", fontWeight: "600", color: "#333" }}>Audit et Logs</h3>
                    <button 
                      style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      onClick={() => setSelectedReport("")}
                    >
                      Retour
                    </button>
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <h4 style={{ marginBottom: "12px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Journal d'audit</h4>
                    <p style={{ color: "#666", marginBottom: "20px" }}>Historique des actions et modifications dans le système</p>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f8f9fa" }}>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Date</th>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Action</th>
                          <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid #dee2e6" }}>Utilisateur</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: "12px", color: "#666" }}>Aucun log disponible</td>
                          <td style={{ padding: "12px", color: "#666" }}>-</td>
                          <td style={{ padding: "12px", color: "#666" }}>-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button 
                      onClick={() => exportToPDF()}
                      style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter PDF
                    </button>
                    <button 
                      onClick={() => exportToExcel()}
                      style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Exporter Excel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de notifications */}
      {showNotifications && (
        <div 
          onClick={() => setShowNotifications(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: "60px 20px 20px 20px",
            zIndex: 1000
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "12px",
              width: "400px",
              maxHeight: "600px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <div style={{
              padding: "20px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>
                Notifications
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  onClick={clearAllNotifications}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#1f6feb",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "6px 8px"
                  }}
                >
                  Effacer les notifications
                </button>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#999",
                    padding: "0",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px"
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#999"
                }}>
                  Aucune notification
                </div>
              ) : (
                notifications.map((notif) => {
                  const isDelegatedTicket = roleName === "Adjoint DSI" && notif.ticket_id && notif.message.includes("délégué par DSI");
                  return (
                  <div
                    key={notif.id}
                    onClick={(e) => {
                      // Ne pas marquer comme lu si on clique sur le bouton
                      if (!notif.read && !(e.target as HTMLElement).closest('button')) {
                        void markNotificationAsRead(notif.id);
                      }
                    }}
                    style={{
                      padding: "12px",
                      marginBottom: "8px",
                      borderRadius: "8px",
                      background: notif.read ? "#f9f9f9" : "#e3f2fd",
                      border: notif.read ? "1px solid #eee" : "1px solid #90caf9",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px"
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          margin: 0,
                          fontSize: "14px",
                          color: "#333",
                          lineHeight: "1.5"
                        }}>
                          {notif.message}
                        </p>
                        <p style={{
                          margin: "4px 0 0 0",
                          fontSize: "11px",
                          color: "#999"
                        }}>
                          {new Date(notif.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        {isDelegatedTicket && notif.ticket_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notif.ticket_id) {
                                setAssignModalTicketId(notif.ticket_id);
                                setShowAssignModal(true);
                                setShowNotifications(false);
                              }
                            }}
                            style={{
                              marginTop: "8px",
                              padding: "6px 12px",
                              background: "#0ea5e9",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "inline-block"
                            }}
                          >
                            Assigner ce ticket
                          </button>
                        )}
                      </div>
                      {!notif.read && (
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#007bff",
                          flexShrink: 0,
                          marginTop: "4px"
                        }}></div>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'assignation pour l'adjoint DSI */}
      {showAssignModal && assignModalTicketId && (() => {
        const ticket = allTickets.find(t => t.id === assignModalTicketId);
        return ticket ? (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              background: "white",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto"
            }}>
              <h3 style={{ marginBottom: "16px", color: "#0ea5e9" }}>Assigner le ticket à un technicien</h3>
              <div style={{ marginBottom: "20px", padding: "12px", background: "#f8f9fa", borderRadius: "4px" }}>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Ticket #{ticket.number}:</strong> {ticket.title}
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Type: <strong>{ticket.type === "materiel" ? "Matériel" : "Applicatif"}</strong>
                </div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  Priorité: <strong>{ticket.priority}</strong>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#333" }}>
                  Sélectionner un technicien <span style={{ color: "#dc3545" }}>*</span>
                </label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                >
                  <option value="">Sélectionner un technicien</option>
                  {getFilteredTechnicians(ticket.type).map((tech) => {
                    const workload = allTickets.filter((tk) => 
                      tk.technician_id === tech.id && 
                      (tk.status === "assigne_technicien" || tk.status === "en_cours")
                    ).length;
                    const specialization = tech.specialization ? ` (${tech.specialization})` : "";
                    return (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}{specialization} - {workload} ticket(s)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#333" }}>
                  Notes/Instructions pour le technicien (optionnel)
                </label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Instructions ou contexte pour le technicien..."
                  rows={3}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignModalTicketId(null);
                    setSelectedTechnician("");
                    setAssignmentNotes("");
                  }}
                  disabled={loading}
                  style={{ padding: "10px 20px", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500" }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => assignModalTicketId && handleAssign(assignModalTicketId)}
                  disabled={loading || !selectedTechnician}
                  style={{ padding: "10px 20px", background: "#0ea5e9", color: "white", border: "none", borderRadius: "4px", cursor: loading || !selectedTechnician ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500", opacity: loading || !selectedTechnician ? 0.6 : 1 }}
                >
                  {loading ? "Assignation..." : "Confirmer l'assignation"}
                </button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* Modal de réouverture avec motif de rejet */}
      {showReopenModal && reopenTicketId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            padding: "24px",
            borderRadius: "8px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginBottom: "16px", color: "#dc3545" }}>Réouvrir le ticket</h3>
            
            {/* Affichage du motif de rejet */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#333" }}>
                Motif de rejet par l'utilisateur :
              </label>
              <div style={{
                padding: "12px",
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "4px",
                color: "#856404",
                fontSize: "14px",
                lineHeight: "1.5",
                minHeight: "60px",
                whiteSpace: "pre-wrap"
              }}>
                {loadingRejectionReason ? (
                  <div style={{ color: "#856404", fontStyle: "italic" }}>Chargement du motif...</div>
                ) : rejectionReason ? (
                  rejectionReason
                ) : (
                  "Aucun motif disponible"
                )}
              </div>
            </div>

            {/* Sélection du technicien */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#333" }}>
                Sélectionner un technicien <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "8px", 
                  border: "1px solid #ddd", 
                  borderRadius: "4px",
                  fontSize: "14px"
                }}
              >
                <option value="">Sélectionner un technicien</option>
                {(() => {
                  const ticket = allTickets.find(t => t.id === reopenTicketId);
                  const filteredTechs = ticket ? getFilteredTechnicians(ticket.type) : technicians;
                  return filteredTechs.map((tech) => {
                    const workload = tech.assigned_tickets_count || 0;
                    const specialization = tech.specialization ? ` (${tech.specialization})` : "";
                    return (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}{specialization} - {workload} ticket(s)
                      </option>
                    );
                  });
                })()}
              </select>
            </div>

            {/* Notes optionnelles */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#333" }}>
                Notes/Instructions pour le technicien (optionnel)
              </label>
              <textarea
                value={assignmentNotes}
                onChange={(e) => setAssignmentNotes(e.target.value)}
                placeholder="Exemple: Prendre en compte le motif de rejet ci-dessus..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  resize: "vertical"
                }}
              />
            </div>

            {/* Boutons d'action */}
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button
                onClick={() => reopenTicketId && handleReopen(reopenTicketId)}
                disabled={loading || !selectedTechnician}
                style={{ 
                  flex: 1, 
                  padding: "10px", 
                  backgroundColor: selectedTechnician ? "#17a2b8" : "#ccc", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px", 
                  cursor: selectedTechnician ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                {loading ? "Réouverture..." : "Confirmer la réouverture"}
              </button>
              <button
                onClick={() => {
                  setShowReopenModal(false);
                  setReopenTicketId(null);
                  setRejectionReason("");
                  setSelectedTechnician("");
                  setAssignmentNotes("");
                }}
                disabled={loading}
                style={{ 
                  flex: 1, 
                  padding: "10px", 
                  background: "#f5f5f5", 
                  border: "1px solid #ddd", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecretaryDashboard;
