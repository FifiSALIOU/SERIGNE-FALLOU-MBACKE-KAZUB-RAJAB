import { useEffect, useState, useRef } from "react";
import React from "react";

interface DSIDashboardProps {
  token: string;
}

interface Ticket {
  id: string;
  number: number;
  title: string;
  creator_id: string;
  creator?: {
    full_name: string;
    email: string;
    agency: string | null;
  };
  user_agency: string | null;
  priority: string;
  status: string;
  technician_id: string | null;
  technician?: {
    full_name: string;
  };
}

interface Technician {
  id: string;
  full_name: string;
  email: string;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  ticket_id?: string | null;
}

interface UserRead {
  full_name: string;
  email: string;
  agency?: string | null;
}

function DSIDashboard({ token }: DSIDashboardProps) {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    openTickets: 0,
    avgResolutionTime: "0 jours",
    userSatisfaction: "0/5",
  });
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showTicketsDropdown, setShowTicketsDropdown] = useState<boolean>(false);
  const [showReportsDropdown, setShowReportsDropdown] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string>("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserRead | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [userAgencyFilter, setUserAgencyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [usersPerPage] = useState<number>(10);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // États pour les paramètres d'apparence
  const [appName, setAppName] = useState<string>(() => {
    return localStorage.getItem("appName") || "Système de Gestion des Tickets";
  });
  const [appTheme, setAppTheme] = useState<string>(() => {
    return localStorage.getItem("appTheme") || "clair";
  });
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem("primaryColor") || "#007bff";
  });
  const [appLogo, setAppLogo] = useState<string | null>(() => {
    return localStorage.getItem("appLogo");
  });
  
  // États locaux pour la section Apparence
  const [localAppName, setLocalAppName] = useState(appName);
  const [localAppTheme, setLocalAppTheme] = useState(appTheme);
  const [localPrimaryColor, setLocalPrimaryColor] = useState(primaryColor);
  const [localAppLogo, setLocalAppLogo] = useState(appLogo);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // États pour les types de tickets
  const [ticketTypes, setTicketTypes] = useState<Array<{
    id: number;
    type: string;
    description: string;
    color: string;
  }>>(() => {
    const saved = localStorage.getItem("ticketTypes");
    if (saved) {
      return JSON.parse(saved);
    }
    // Types par défaut
    return [
      { id: 1, type: "Matériel", description: "Problèmes matériels", color: "#dc3545" },
      { id: 2, type: "Applicatif", description: "Problèmes logiciels", color: "#28a745" },
      { id: 3, type: "Réseau", description: "Problèmes réseau", color: "#ffc107" },
      { id: 4, type: "Accès", description: "Problèmes d'accès", color: "#9c27b0" },
      { id: 5, type: "Autre", description: "Autres problèmes", color: "#6c757d" }
    ];
  });
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<number | null>(null);
  const [newType, setNewType] = useState({ type: "", description: "", color: "#007bff" });
  
  // États pour les priorités
  const [priorities, setPriorities] = useState<Array<{
    id: number;
    priority: string;
    level: number;
    color: string;
    maxTime: string;
    maxTimeValue: number;
    maxTimeUnit: string;
  }>>(() => {
    const saved = localStorage.getItem("priorities");
    if (saved) {
      return JSON.parse(saved);
    }
    // Priorités par défaut
    return [
      { id: 1, priority: "Critique", level: 1, color: "#dc3545", maxTime: "1 heure", maxTimeValue: 1, maxTimeUnit: "heure" },
      { id: 2, priority: "Haute", level: 2, color: "#ff9800", maxTime: "4 heures", maxTimeValue: 4, maxTimeUnit: "heures" },
      { id: 3, priority: "Moyenne", level: 3, color: "#ffc107", maxTime: "1 jour", maxTimeValue: 1, maxTimeUnit: "jour" },
      { id: 4, priority: "Basse", level: 4, color: "#28a745", maxTime: "3 jours", maxTimeValue: 3, maxTimeUnit: "jours" }
    ];
  });
  const [showAddPriorityModal, setShowAddPriorityModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<number | null>(null);
  const [newPriority, setNewPriority] = useState({ 
    priority: "", 
    level: 1, 
    color: "#dc3545", 
    maxTimeValue: 1, 
    maxTimeUnit: "heure" 
  });
  
  // États pour les paramètres de sécurité
  const [securitySettings, setSecuritySettings] = useState(() => {
    const saved = localStorage.getItem("securitySettings");
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      // Authentification
      mfaRequired: true,
      sessionTimeout: 30,
      connectionHistory: true,
      suspiciousConnectionAlerts: true,
      // Mot de Passe
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      passwordExpiration: 90,
      // Audit et Logging
      recordAllActions: true,
      recordSensitiveDataChanges: true,
      recordFailedLogins: true,
      keepLogsFor: 90
    };
  });
  
  // États pour les rapports
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<Array<{
    id: number;
    report: string;
    generatedBy: string;
    date: string;
  }>>(() => {
    const saved = localStorage.getItem("recentReports");
    if (saved) {
      return JSON.parse(saved);
    }
    // Rapports par défaut
    return [
      { id: 1, report: "Performance Janvier 2024", generatedBy: "Admin", date: "01/02/2024" },
      { id: 2, report: "Tickets par Département", generatedBy: "DSI", date: "31/01/2024" },
      { id: 3, report: "Satisfaction Utilisateurs", generatedBy: "Admin", date: "30/01/2024" }
    ];
  });
  
  // Mettre à jour les états locaux quand on entre dans la section Apparence
  useEffect(() => {
    if (activeSection === "apparence") {
      setLocalAppName(appName);
      setLocalAppTheme(appTheme);
      setLocalPrimaryColor(primaryColor);
      setLocalAppLogo(appLogo);
    }
  }, [activeSection, appName, appTheme, primaryColor, appLogo]);
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    phone: "",
    agency: "",
    role: "",
    status: "actif",
    password: "",
    confirmPassword: "",
    generateRandomPassword: true,
    sendEmail: true
  });
  const [editUser, setEditUser] = useState({
    full_name: "",
    email: "",
    phone: "",
    agency: "",
    role: "",
    status: "actif"
  });

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    // Mapper les données de l'utilisateur au format du formulaire
    let roleName = "";
    if (user.role) {
      if (typeof user.role === "object" && user.role.name) {
        roleName = user.role.name;
      } else if (typeof user.role === "string") {
        roleName = user.role;
      }
    }
    
    const statusValue = user.is_active !== undefined ? (user.is_active ? "actif" : "inactif") : (user.status === "Actif" || user.status === "actif" ? "actif" : "inactif");
    
    setEditUser({
      full_name: user.full_name || user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      agency: user.agency || "",
      role: roleName,
      status: statusValue
    });
    setShowEditUserModal(true);
  };

  // Fonctions pour la section Apparence
  const handleSaveAppearance = () => {
    // Sauvegarder dans localStorage
    localStorage.setItem("appName", localAppName);
    localStorage.setItem("appTheme", localAppTheme);
    localStorage.setItem("primaryColor", localPrimaryColor);
    if (localAppLogo) {
      localStorage.setItem("appLogo", localAppLogo);
    }
    
    // Mettre à jour les états globaux
    setAppName(localAppName);
    setAppTheme(localAppTheme);
    setPrimaryColor(localPrimaryColor);
    setAppLogo(localAppLogo);
    
    // Appliquer le thème
    if (localAppTheme === "sombre") {
      document.body.style.backgroundColor = "#1a1a1a";
      document.body.style.color = "#fff";
    } else if (localAppTheme === "clair") {
      document.body.style.backgroundColor = "#fff";
      document.body.style.color = "#333";
    } else {
      // Auto - utiliser les préférences du système
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.style.backgroundColor = prefersDark ? "#1a1a1a" : "#fff";
      document.body.style.color = prefersDark ? "#fff" : "#333";
    }
    
    alert("Paramètres d'apparence enregistrés avec succès !");
  };

  const handleCancelAppearance = () => {
    setLocalAppName(appName);
    setLocalAppTheme(appTheme);
    setLocalPrimaryColor(primaryColor);
    setLocalAppLogo(appLogo);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Taille maximale : 2MB");
        return;
      }
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        alert("Format non accepté. Utilisez PNG ou JPG");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalAppLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = () => {
    setLocalAppLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getColorName = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "#007bff": "Bleu",
      "#28a745": "Vert",
      "#dc3545": "Rouge",
      "#ffc107": "Jaune",
      "#6c757d": "Gris",
      "#17a2b8": "Cyan",
      "#ff9800": "Orange",
      "#9c27b0": "Violet"
    };
    return colorMap[color] || "Personnalisé";
  };

  // Fonctions pour les types de tickets
  const handleAddType = () => {
    if (!newType.type.trim() || !newType.description.trim()) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    const newId = ticketTypes.length > 0 ? Math.max(...ticketTypes.map(t => t.id)) + 1 : 1;
    const updatedTypes = [...ticketTypes, { ...newType, id: newId }];
    setTicketTypes(updatedTypes);
    localStorage.setItem("ticketTypes", JSON.stringify(updatedTypes));
    setNewType({ type: "", description: "", color: "#007bff" });
    setShowAddTypeModal(false);
    alert("Type de ticket ajouté avec succès !");
  };

  const handleEditType = (typeId: number) => {
    const type = ticketTypes.find(t => t.id === typeId);
    if (type) {
      setNewType({ type: type.type, description: type.description, color: type.color });
      setEditingType(typeId);
      setShowAddTypeModal(true);
    }
  };

  const handleUpdateType = () => {
    if (!newType.type.trim() || !newType.description.trim()) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    const updatedTypes = ticketTypes.map(t => 
      t.id === editingType ? { ...t, ...newType } : t
    );
    setTicketTypes(updatedTypes);
    localStorage.setItem("ticketTypes", JSON.stringify(updatedTypes));
    setNewType({ type: "", description: "", color: "#007bff" });
    setEditingType(null);
    setShowAddTypeModal(false);
    alert("Type de ticket modifié avec succès !");
  };

  const handleDeleteType = (typeId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce type de ticket ?")) {
      const updatedTypes = ticketTypes.filter(t => t.id !== typeId);
      setTicketTypes(updatedTypes);
      localStorage.setItem("ticketTypes", JSON.stringify(updatedTypes));
      alert("Type de ticket supprimé avec succès !");
    }
  };

  const getTypeColorName = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "#dc3545": "Rouge",
      "#28a745": "Vert",
      "#ffc107": "Jaune",
      "#9c27b0": "Violet",
      "#6c757d": "Gris",
      "#007bff": "Bleu",
      "#17a2b8": "Cyan",
      "#ff9800": "Orange"
    };
    return colorMap[color] || "Personnalisé";
  };

  // Fonctions pour les priorités
  const handleAddPriority = () => {
    if (!newPriority.priority.trim()) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    const maxTime = `${newPriority.maxTimeValue} ${newPriority.maxTimeUnit}`;
    const newId = priorities.length > 0 ? Math.max(...priorities.map(p => p.id)) + 1 : 1;
    const updatedPriorities = [...priorities, { 
      ...newPriority, 
      id: newId,
      maxTime 
    }];
    setPriorities(updatedPriorities);
    localStorage.setItem("priorities", JSON.stringify(updatedPriorities));
    setNewPriority({ priority: "", level: 1, color: "#dc3545", maxTimeValue: 1, maxTimeUnit: "heure" });
    setShowAddPriorityModal(false);
    alert("Priorité ajoutée avec succès !");
  };

  const handleEditPriority = (priorityId: number) => {
    const priority = priorities.find(p => p.id === priorityId);
    if (priority) {
      setNewPriority({ 
        priority: priority.priority, 
        level: priority.level, 
        color: priority.color, 
        maxTimeValue: priority.maxTimeValue, 
        maxTimeUnit: priority.maxTimeUnit 
      });
      setEditingPriority(priorityId);
      setShowAddPriorityModal(true);
    }
  };

  const handleUpdatePriority = () => {
    if (!newPriority.priority.trim()) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    const maxTime = `${newPriority.maxTimeValue} ${newPriority.maxTimeUnit}`;
    const updatedPriorities = priorities.map(p => 
      p.id === editingPriority ? { ...p, ...newPriority, maxTime } : p
    );
    setPriorities(updatedPriorities);
    localStorage.setItem("priorities", JSON.stringify(updatedPriorities));
    setNewPriority({ priority: "", level: 1, color: "#dc3545", maxTimeValue: 1, maxTimeUnit: "heure" });
    setEditingPriority(null);
    setShowAddPriorityModal(false);
    alert("Priorité modifiée avec succès !");
  };

  const handleDeletePriority = (priorityId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette priorité ?")) {
      const updatedPriorities = priorities.filter(p => p.id !== priorityId);
      setPriorities(updatedPriorities);
      localStorage.setItem("priorities", JSON.stringify(updatedPriorities));
      alert("Priorité supprimée avec succès !");
    }
  };

  const getPriorityColorName = (color: string) => {
    const colorMap: { [key: string]: string } = {
      "#dc3545": "Rouge",
      "#ff9800": "Orange",
      "#ffc107": "Jaune",
      "#28a745": "Vert",
      "#007bff": "Bleu",
      "#6c757d": "Gris",
      "#9c27b0": "Violet"
    };
    return colorMap[color] || "Personnalisé";
  };

  // Fonction pour sauvegarder les paramètres de sécurité
  const handleSaveSecurity = () => {
    localStorage.setItem("securitySettings", JSON.stringify(securitySettings));
    alert("Paramètres de sécurité enregistrés avec succès !");
  };

  const handleCancelSecurity = () => {
    const saved = localStorage.getItem("securitySettings");
    if (saved) {
      setSecuritySettings(JSON.parse(saved));
    }
  };

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

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    window.location.href = "/";
  }

  // Appliquer le thème et la couleur primaire au chargement
  useEffect(() => {
    if (appTheme === "sombre") {
      document.body.style.backgroundColor = "#1a1a1a";
      document.body.style.color = "#fff";
    } else if (appTheme === "clair") {
      document.body.style.backgroundColor = "#fff";
      document.body.style.color = "#333";
    } else {
      // Auto - utiliser les préférences du système
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.style.backgroundColor = prefersDark ? "#1a1a1a" : "#fff";
      document.body.style.color = prefersDark ? "#fff" : "#333";
    }
  }, [appTheme]);

  useEffect(() => {
    async function loadData() {
      try {
        // Charger tous les tickets
        const ticketsRes = await fetch("http://localhost:8000/tickets/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          setAllTickets(ticketsData);
          // Calculer les métriques
          const openCount = ticketsData.filter((t: Ticket) => 
            t.status !== "cloture" && t.status !== "resolu"
          ).length;
          setMetrics(prev => ({ ...prev, openTickets: openCount }));
        }

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

        // Charger les informations de l'utilisateur connecté
        const meRes = await fetch("http://localhost:8000/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUserInfo({
            full_name: meData.full_name,
            email: meData.email,
            agency: meData.agency
          });
          if (meData.role && meData.role.name) {
            setUserRole(meData.role.name);
            
            // Charger tous les utilisateurs (si Admin)
            if (meData.role.name === "Admin") {
              try {
                const usersRes = await fetch("http://localhost:8000/users/", {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                if (usersRes.ok) {
                  const usersData = await usersRes.json();
                  setAllUsers(usersData || []);
                } else {
                  console.error("Erreur chargement utilisateurs:", usersRes.status);
                  setAllUsers([]);
                }
              } catch (err) {
                console.error("Erreur chargement utilisateurs:", err);
                setAllUsers([]);
              }
            }
          }
        }

        // Charger les métriques (si l'endpoint existe)
        try {
          const metricsRes = await fetch("http://localhost:8000/reports/metrics", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            setMetrics(metricsData);
          }
        } catch (err) {
          // Endpoint peut ne pas exister encore
          console.log("Endpoint métriques non disponible");
        }

         // Charger les notifications
         await loadNotifications();
         await loadUnreadCount();
       } catch (err) {
         console.error("Erreur chargement données:", err);
       }
     }
     void loadData();

     // Recharger les notifications toutes les 30 secondes
     const interval = setInterval(() => {
       void loadNotifications();
       void loadUnreadCount();
     }, 30000);
     
     return () => clearInterval(interval);
   }, [token]);

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
        alert("Ticket assigné avec succès");
      } else {
        const error = await res.json();
        alert(`Erreur: ${error.detail || "Impossible d'assigner le ticket"}`);
      }
    } catch (err) {
      console.error("Erreur assignation:", err);
      alert("Erreur lors de l'assignation");
    } finally {
      setLoading(false);
    }
  }

  async function handleReassign(ticketId: string) {
    if (!selectedTechnician) {
      alert("Veuillez sélectionner un technicien pour la réassignation");
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
          reason: "Réassignation par DSI",
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

  async function handleReopen(ticketId: string) {
    if (!selectedTechnician) {
      alert("Veuillez sélectionner un technicien pour la réouverture");
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir réouvrir ce ticket et le réassigner ?")) return;

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
          reason: "Réouverture après rejet utilisateur",
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
  const closedTickets = allTickets.filter((t) => t.status === "cloture");
  const rejectedTickets = allTickets.filter((t) => t.status === "rejete");

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

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", background: "#f5f5f5" }}>
      {/* Sidebar */}
      <div style={{ 
        width: "250px", 
        background: "#1e293b", 
        color: "white", 
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                <path d="M4 7L12 11L20 7" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 11V21" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: "18px", fontWeight: "600" }}>{appName}</div>
          </div>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="11" width="3" height="7" rx="1" fill="white" />
              <rect x="10.5" y="8" width="3" height="10" rx="1" fill="white" />
              <rect x="17" y="5" width="3" height="13" rx="1" fill="white" />
            </svg>
          </div>
          <div>Tableau de Bord</div>
        </div>
        <div style={{ position: "relative" }}>
          <div 
            onClick={() => setShowTicketsDropdown(!showTicketsDropdown)}
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
            <div style={{ flex: 1 }}>Tickets</div>
            <div style={{ fontSize: "12px" }}>{showTicketsDropdown ? "▼" : "▶"}</div>
          </div>
          {showTicketsDropdown && (
            <div style={{ 
              marginLeft: "36px", 
              marginTop: "8px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "4px" 
            }}>
              <div 
                onClick={() => {
                  setStatusFilter("all");
                  setActiveSection("tickets");
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  background: statusFilter === "all" ? "rgba(255,255,255,0.1)" : "transparent"
                }}
              >
                Tous les tickets
              </div>
              <div 
                onClick={() => {
                  setStatusFilter("en_attente_analyse");
                  setActiveSection("tickets");
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  background: statusFilter === "en_attente_analyse" ? "rgba(255,255,255,0.1)" : "transparent"
                }}
              >
                En attente
              </div>
              <div 
                onClick={() => {
                  setStatusFilter("en_traitement");
                  setActiveSection("tickets");
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  background: statusFilter === "en_traitement" ? "rgba(255,255,255,0.1)" : "transparent"
                }}
              >
                En traitement
              </div>
              <div 
                onClick={() => {
                  setStatusFilter("resolu");
                  setActiveSection("tickets");
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  background: statusFilter === "resolu" ? "rgba(255,255,255,0.1)" : "transparent"
                }}
              >
                Résolus
              </div>
              <div 
                onClick={() => {
                  setStatusFilter("cloture");
                  setActiveSection("tickets");
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  background: statusFilter === "cloture" ? "rgba(255,255,255,0.1)" : "transparent"
                }}
              >
                Clôturés
              </div>
              <div 
                onClick={() => {
                  setStatusFilter("rejete");
                  setActiveSection("tickets");
                }}
                style={{ 
                  padding: "8px 12px", 
                  borderRadius: "4px", 
                  cursor: "pointer",
                  background: statusFilter === "rejete" ? "rgba(255,255,255,0.1)" : "transparent"
                }}
              >
                Rejetés
              </div>
            </div>
          )}
        </div>
        {userRole === "Admin" && (
          <div 
            onClick={() => setActiveSection("users")}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px", 
              padding: "12px 16px", 
              cursor: "pointer",
              color: "white",
              borderRadius: "4px",
              background: activeSection === "users" ? "rgba(255,255,255,0.1)" : "transparent"
            }}
          >
            <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div style={{ flex: 1 }}>Utilisateurs</div>
          </div>
        )}
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>Rapports</div>
            <div style={{ fontSize: "12px" }}>{showReportsDropdown ? "▼" : "▶"}</div>
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
        {userRole === "Admin" && (
          <div>
            <div
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "12px", 
                padding: "12px 16px", 
                cursor: "pointer",
                color: "white",
                borderRadius: "4px",
                background: activeSection === "settings" ? "rgba(255,255,255,0.1)" : "transparent"
              }}
            >
              <div style={{ width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                </svg>
              </div>
              <div style={{ flex: 1 }}>Paramètres</div>
              <div style={{ fontSize: "12px" }}>{showSettingsDropdown ? "▼" : "▶"}</div>
            </div>
            {showSettingsDropdown && (
              <div style={{ 
                marginLeft: "36px", 
                marginTop: "8px", 
                marginBottom: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <div
                  onClick={() => setActiveSection("apparence")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "apparence" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Apparence
                </div>
                <div
                  onClick={() => setActiveSection("email")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "email" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Email
                </div>
                <div
                  onClick={() => setActiveSection("securite")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "securite" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Sécurité
                </div>
                <div
                  onClick={() => setActiveSection("types-tickets")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "types-tickets" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Types de Tickets
                </div>
                <div
                  onClick={() => setActiveSection("priorites")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "priorites" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Priorités
                </div>
                <div
                  onClick={() => setActiveSection("rapports-settings")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "rapports-settings" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Rapports
                </div>
                <div
                  onClick={() => setActiveSection("maintenance")}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    color: "white",
                    borderRadius: "4px",
                    background: activeSection === "maintenance" ? "rgba(255,255,255,0.1)" : "transparent",
                    fontSize: "14px"
                  }}
                >
                  Maintenance
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Barre de navigation en haut */}
        <div style={{
          background: "#1e293b",
          padding: "16px 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "24px",
          borderBottom: "1px solid #0f172a"
        }}>
          <div style={{ 
            cursor: "pointer", 
            width: "24px", 
            height: "24px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "white"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor"/>
              <path d="M19 13a2 2 0 0 1-2 2H5l-4 4V3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="currentColor" opacity="0.6" transform="translate(2, 2)"/>
            </svg>
          </div>
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
          <div style={{ 
            width: "1px", 
            height: "24px", 
            background: "#4b5563" 
          }}></div>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            color: "white",
            position: "relative"
          }}>
            <span style={{ fontSize: "14px", fontWeight: "500" }}>
              {userInfo?.full_name || "Utilisateur"}
            </span>
            <div 
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => {
                const menu = document.getElementById("profile-menu");
                if (menu) {
                  menu.style.display = menu.style.display === "none" ? "block" : "none";
                }
              }}
            >
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "14px",
                fontWeight: "600"
              }}>
                {userInfo?.full_name ? userInfo.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <div style={{
                position: "absolute",
                bottom: "0",
                right: "0",
                width: "12px",
                height: "12px",
                background: "#10b981",
                borderRadius: "50%",
                border: "2px solid #1e293b"
              }}></div>
            </div>
            <div
              id="profile-menu"
              style={{
                position: "absolute",
                right: 0,
                top: "48px",
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                padding: "8px 0",
                minWidth: "160px",
                zIndex: 50,
                color: "#111827",
                display: "none"
              }}
            >
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#111827"
                }}
              >
                <span style={{ fontSize: "16px" }}>⎋</span>
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal avec scroll */}
        <div style={{ flex: 1, padding: "30px", overflow: "auto" }}>
          {activeSection === "dashboard" && (
            <>
              <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>Tableau de bord - DSI</h2>

      {/* Métriques */}
      <div style={{ display: "flex", gap: "16px", margin: "24px 0" }}>
        <div style={{ padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", flex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800" }}>{pendingCount}</div>
          <div style={{ color: "#666", marginTop: "4px" }}>Tickets en attente</div>
        </div>
        <div style={{ padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", flex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2196f3" }}>{assignedCount}</div>
          <div style={{ color: "#666", marginTop: "4px" }}>Tickets assignés</div>
        </div>
        <div style={{ padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", flex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4caf50" }}>{resolvedCount}</div>
          <div style={{ color: "#666", marginTop: "4px" }}>Tickets résolus</div>
        </div>
        <div style={{ padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", flex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#2196f3" }}>{metrics.openTickets}</div>
          <div style={{ color: "#666", marginTop: "4px" }}>Tickets ouverts</div>
        </div>
        <div style={{ padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", flex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800" }}>{metrics.avgResolutionTime}</div>
          <div style={{ color: "#666", marginTop: "4px" }}>Temps moyen</div>
        </div>
        <div style={{ padding: "16px", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", flex: 1 }}>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4caf50" }}>{metrics.userSatisfaction}</div>
          <div style={{ color: "#666", marginTop: "4px" }}>Satisfaction</div>
        </div>
      </div>

      {/* Tableau des tickets */}
      <h3 style={{ marginTop: "32px", marginBottom: "16px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Tickets en attente d'analyse</h3>
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
          {allTickets.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                Aucun ticket
              </td>
            </tr>
          ) : (
            allTickets.map((t) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px 16px" }}>#{t.number}</td>
                <td style={{ padding: "12px 16px" }}>{t.title}</td>
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
                    background: t.priority === "critique" ? "#f44336" : t.priority === "haute" ? "#ff9800" : t.priority === "moyenne" ? "#ffc107" : "#9e9e9e",
                    color: "white"
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
                    background: t.status === "en_attente_analyse" ? "#ffc107" : 
                               t.status === "assigne_technicien" ? "#007bff" : 
                               t.status === "en_cours" ? "#ff9800" : 
                               t.status === "resolu" ? "#28a745" : 
                               t.status === "cloture" ? "#6c757d" :
                               t.status === "rejete" ? "#dc3545" : "#e0e0e0",
                    color: "white"
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
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={selectedTechnician}
                          onChange={(e) => setSelectedTechnician(e.target.value)}
                          style={{ padding: "4px 8px", fontSize: "12px", minWidth: "150px" }}
                        >
                          <option value="">Sélectionner un technicien</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.full_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssign(t.id)}
                          disabled={loading}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => setSelectedTicket(t.id)}
                          disabled={loading}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Assigner
                        </button>
                        <button
                          onClick={() => handleEscalate(t.id)}
                          disabled={loading}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Escalader
                        </button>
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
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.full_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleReassign(t.id)}
                          disabled={loading}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => setSelectedTicket(t.id)}
                          disabled={loading}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Réassigner
                        </button>
                        <button
                          onClick={() => handleEscalate(t.id)}
                          disabled={loading}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        >
                          Escalader
                        </button>
                      </div>
                    )
                  ) : t.status === "resolu" ? (
                    // Action pour tickets résolus
                    <button
                      onClick={() => handleClose(t.id)}
                      disabled={loading}
                      style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Clôturer
                    </button>
                  ) : t.status === "rejete" ? (
                    // Action pour tickets rejetés - Réouverture
                    selectedTicket === t.id ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <select
                          value={selectedTechnician}
                          onChange={(e) => setSelectedTechnician(e.target.value)}
                          style={{ padding: "4px 8px", fontSize: "12px", minWidth: "150px" }}
                        >
                          <option value="">Sélectionner un technicien</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.full_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleReopen(t.id)}
                          disabled={loading || !selectedTechnician}
                          style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
                      <button
                        onClick={() => setSelectedTicket(t.id)}
                        disabled={loading}
                        style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      >
                        Réouvrir
                      </button>
                    )
                  ) : (
                    // Pas d'action pour tickets clôturés
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      {t.status === "cloture" ? "Clôturé" : "N/A"}
                    </span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

              {/* Section Rapports */}
              <div style={{ marginTop: "32px", background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                <h3 style={{ marginBottom: "16px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Rapports et Métriques</h3>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  <li style={{ padding: "12px", borderBottom: "1px solid #eee" }}>📊 Tickets par agence</li>
                  <li style={{ padding: "12px", borderBottom: "1px solid #eee" }}>👥 Performance des techniciens</li>
                  <li style={{ padding: "12px", borderBottom: "1px solid #eee" }}>🔄 Problèmes récurrents</li>
                  <li style={{ padding: "12px", borderBottom: "1px solid #eee" }}>⚡ Taux de résolution au premier contact</li>
                  <li style={{ padding: "12px" }}>⏱️ Temps moyen de réponse</li>
                </ul>
              </div>

              <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                <button style={{ padding: "10px 15px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Générer rapport</button>
                <button style={{ padding: "10px 15px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter données</button>
                <button style={{ padding: "10px 15px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Paramètres</button>
              </div>
            </>
          )}

          {activeSection === "tickets" && (
            <>
              <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>Tous les tickets</h2>
              
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
                    filteredTickets.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px 16px" }}>#{t.number}</td>
                        <td style={{ padding: "12px 16px" }}>{t.title}</td>
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
                            background: t.priority === "critique" ? "#f44336" : t.priority === "haute" ? "#ff9800" : t.priority === "moyenne" ? "#ffc107" : "#9e9e9e",
                            color: "white"
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
                            background: t.status === "en_attente_analyse" ? "#ffc107" : 
                                       t.status === "assigne_technicien" ? "#007bff" : 
                                       t.status === "en_cours" ? "#ff9800" : 
                                       t.status === "resolu" ? "#28a745" : 
                                       t.status === "cloture" ? "#6c757d" :
                                       t.status === "rejete" ? "#dc3545" : "#e0e0e0",
                            color: "white"
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
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                <select
                                  value={selectedTechnician}
                                  onChange={(e) => setSelectedTechnician(e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: "12px", minWidth: "150px" }}
                                >
                                  <option value="">Sélectionner un technicien</option>
                                  {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                      {tech.full_name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleAssign(t.id)}
                                  disabled={loading || !selectedTechnician}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                <button
                                  onClick={() => setSelectedTicket(t.id)}
                                  disabled={loading}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  Assigner
                                </button>
                                <button
                                  onClick={() => handleEscalate(t.id)}
                                  disabled={loading}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  Escalader
                                </button>
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
                                  {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                      {tech.full_name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleReassign(t.id)}
                                  disabled={loading}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                <button
                                  onClick={() => setSelectedTicket(t.id)}
                                  disabled={loading}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  Réassigner
                                </button>
                                <button
                                  onClick={() => handleEscalate(t.id)}
                                  disabled={loading}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  Escalader
                                </button>
                              </div>
                            )
                          ) : t.status === "resolu" ? (
                            <button
                              onClick={() => handleClose(t.id)}
                              disabled={loading}
                              style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Clôturer
                            </button>
                          ) : t.status === "rejete" ? (
                            selectedTicket === t.id ? (
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                <select
                                  value={selectedTechnician}
                                  onChange={(e) => setSelectedTechnician(e.target.value)}
                                  style={{ padding: "4px 8px", fontSize: "12px", minWidth: "150px" }}
                                >
                                  <option value="">Sélectionner un technicien</option>
                                  {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                      {tech.full_name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleReopen(t.id)}
                                  disabled={loading || !selectedTechnician}
                                  style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
                              <button
                                onClick={() => setSelectedTicket(t.id)}
                                disabled={loading}
                                style={{ fontSize: "12px", padding: "6px 12px", backgroundColor: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                              >
                                Réouvrir
                              </button>
                            )
                          ) : (
                            <span style={{ color: "#999", fontSize: "12px" }}>
                              {t.status === "cloture" ? "Clôturé" : "N/A"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}

          {activeSection === "reports" && (
            <>
              <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>Rapports et Métriques</h2>
              
              {!selectedReport && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <p style={{ color: "#666", fontSize: "16px", marginBottom: "20px" }}>Sélectionnez un type de rapport dans le menu latéral</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                    <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "8px", cursor: "pointer" }} onClick={() => setSelectedReport("statistiques")}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#333" }}>📊 Statistiques générales</h3>
                      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Nombre total, répartition par statut, priorité, type</p>
                    </div>
                    <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "8px", cursor: "pointer" }} onClick={() => setSelectedReport("metriques")}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#333" }}>⚡ Métriques de performance</h3>
                      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Temps moyen, satisfaction, escalades, réouvertures</p>
                    </div>
                    <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "8px", cursor: "pointer" }} onClick={() => setSelectedReport("agence")}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#333" }}>🏢 Analyses par agence</h3>
                      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Volume, temps moyen, satisfaction par agence</p>
                    </div>
                    <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "8px", cursor: "pointer" }} onClick={() => setSelectedReport("technicien")}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#333" }}>👥 Analyses par technicien</h3>
                      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Tickets traités, temps moyen, charge, satisfaction</p>
                    </div>
                    <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "8px", cursor: "pointer" }} onClick={() => setSelectedReport("evolutions")}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#333" }}>📈 Évolutions dans le temps</h3>
                      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Tendances, pics d'activité, performance</p>
                    </div>
                    <div style={{ padding: "16px", border: "1px solid #eee", borderRadius: "8px", cursor: "pointer" }} onClick={() => setSelectedReport("recurrents")}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#333" }}>🔄 Problèmes récurrents</h3>
                      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Types fréquents, agences, patterns</p>
                    </div>
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
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#28a745", marginBottom: "8px" }}>{resolvedCount + closedTickets.length}</div>
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
                          <td style={{ padding: "12px", textAlign: "right" }}>{pendingCount}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((pendingCount / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Assignés/En cours</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{assignedCount}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((assignedCount / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Résolus</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{resolvedCount}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((resolvedCount / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Clôturés</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{closedTickets.length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((closedTickets.length / allTickets.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "12px" }}>Rejetés</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{rejectedTickets.length}</td>
                          <td style={{ padding: "12px", textAlign: "right" }}>{allTickets.length > 0 ? ((rejectedTickets.length / allTickets.length) * 100).toFixed(1) : 0}%</td>
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
                    <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                    <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                  </div>
                </div>
              )}

              {selectedReport === "metriques" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Métriques de performance</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "24px" }}>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800", marginBottom: "8px" }}>{metrics.avgResolutionTime}</div>
                      <div style={{ color: "#666" }}>Temps moyen de résolution</div>
                    </div>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#4caf50", marginBottom: "8px" }}>{metrics.userSatisfaction}</div>
                      <div style={{ color: "#666" }}>Taux de satisfaction utilisateur</div>
                    </div>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#dc3545", marginBottom: "8px" }}>
                        {allTickets.filter((t) => t.priority === "critique" && (t.status === "en_attente_analyse" || t.status === "assigne_technicien" || t.status === "en_cours")).length}
                      </div>
                      <div style={{ color: "#666" }}>Tickets escaladés (critiques en cours)</div>
                    </div>
                    <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px" }}>
                      <div style={{ fontSize: "32px", fontWeight: "bold", color: "#17a2b8", marginBottom: "8px" }}>
                        {rejectedTickets.length > 0 ? ((allTickets.filter((t) => t.status === "rejete" && allTickets.some(tt => tt.id === t.id && tt.status !== "rejete")).length / rejectedTickets.length) * 100).toFixed(1) : 0}%
                      </div>
                      <div style={{ color: "#666" }}>Taux de réouverture</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                    <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                  </div>
                </div>
              )}

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
                          return (
                            <tr key={agency}>
                              <td style={{ padding: "12px" }}>{agency}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{agencyTickets.length}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>N/A</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>N/A</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                    <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
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
                          return (
                            <tr key={tech.id}>
                              <td style={{ padding: "12px" }}>{tech.full_name}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{techTickets.filter((t) => t.status === "resolu" || t.status === "cloture").length}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>N/A</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>{inProgress}</td>
                              <td style={{ padding: "12px", textAlign: "right" }}>N/A</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                    <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                  </div>
                </div>
              )}

              {selectedReport === "evolutions" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Évolutions dans le temps</h3>
                  <p style={{ color: "#666", marginBottom: "24px" }}>Les graphiques d'évolution seront affichés ici (à implémenter avec une bibliothèque de graphiques)</p>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                    <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                  </div>
                </div>
              )}

              {selectedReport === "recurrents" && (
                <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                  <h3 style={{ marginBottom: "20px", fontSize: "22px", fontWeight: "600", color: "#333" }}>Problèmes récurrents</h3>
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
                    <button style={{ padding: "10px 20px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter PDF</button>
                    <button style={{ padding: "10px 20px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Exporter Excel</button>
                  </div>
                </div>
              )}
             </>
           )}

           {activeSection === "users" && (() => {
             // Filtrer les utilisateurs
             let filteredUsers = allUsers;
             
             if (userRoleFilter !== "all") {
               filteredUsers = filteredUsers.filter((u: any) => u.role?.name === userRoleFilter);
             }
             
             if (userStatusFilter !== "all") {
               filteredUsers = filteredUsers.filter((u: any) => {
                 const isActive = u.is_active !== false;
                 return userStatusFilter === "actif" ? isActive : !isActive;
               });
             }
             
             if (userAgencyFilter !== "all") {
               filteredUsers = filteredUsers.filter((u: any) => u.agency === userAgencyFilter);
             }
             
             if (searchQuery) {
               filteredUsers = filteredUsers.filter((u: any) => 
                 u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 u.email?.toLowerCase().includes(searchQuery.toLowerCase())
               );
             }
             
             // Pagination
             const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
             const startIndex = (currentPage - 1) * usersPerPage;
             const endIndex = startIndex + usersPerPage;
             const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
             
             // Récupérer les rôles et agences uniques pour les filtres
             const uniqueRoles = Array.from(new Set(allUsers.map((u: any) => u.role?.name).filter(Boolean)));
             const uniqueAgencies = Array.from(new Set(allUsers.map((u: any) => u.agency).filter(Boolean)));
             
             return (
               <>
                 <h2 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>Gestion des utilisateurs</h2>
                 
                 {/* Barre d'actions */}
                 <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                   <button 
                     onClick={() => setShowAddUserModal(true)}
                     style={{ padding: "8px 16px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}
                   >
                     [+ Ajouter un utilisateur]
                   </button>
                   <button style={{ padding: "8px 16px", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>
                     [Importer CSV]
                   </button>
                   <button style={{ padding: "8px 16px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "14px" }}>
                     [Exporter]
                   </button>
                 </div>
                 
                 {/* Filtres */}
                 <div style={{ marginBottom: "16px" }}>
                   <div style={{ display: "flex", gap: "16px", marginBottom: "12px", alignItems: "center", flexWrap: "wrap" }}>
                     <span style={{ color: "#28a745", fontWeight: "500" }}>Filtrer :</span>
                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <span style={{ color: "#28a745", fontWeight: "500" }}>Rôle :</span>
                       <div style={{ position: "relative", display: "inline-block" }}>
                         <select
                           value={userRoleFilter}
                           onChange={(e) => {
                             setUserRoleFilter(e.target.value);
                             setCurrentPage(1);
                           }}
                           style={{ 
                             padding: "6px 24px 6px 12px", 
                             borderRadius: "4px", 
                             border: "1px solid #ddd", 
                             backgroundColor: "white", 
                             color: "#333", 
                             fontSize: "14px", 
                             cursor: "pointer",
                             appearance: "none",
                             WebkitAppearance: "none",
                             MozAppearance: "none"
                           }}
                         >
                           <option value="all">Tous</option>
                           {uniqueRoles.map((role) => (
                             <option key={role} value={role}>{role}</option>
                           ))}
                         </select>
                         <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666", pointerEvents: "none" }}>▼</span>
                       </div>
                     </div>
                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <span style={{ color: "#28a745", fontWeight: "500" }}>Statut :</span>
                       <div style={{ position: "relative", display: "inline-block" }}>
                         <select
                           value={userStatusFilter}
                           onChange={(e) => {
                             setUserStatusFilter(e.target.value);
                             setCurrentPage(1);
                           }}
                           style={{ 
                             padding: "6px 24px 6px 12px", 
                             borderRadius: "4px", 
                             border: "1px solid #ddd", 
                             backgroundColor: "white", 
                             color: "#333", 
                             fontSize: "14px", 
                             cursor: "pointer",
                             appearance: "none",
                             WebkitAppearance: "none",
                             MozAppearance: "none"
                           }}
                         >
                           <option value="all">Tous</option>
                           <option value="actif">Actif</option>
                           <option value="inactif">Inactif</option>
                         </select>
                         <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666", pointerEvents: "none" }}>▼</span>
                       </div>
                     </div>
                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <span style={{ color: "#28a745", fontWeight: "500" }}>Département :</span>
                       <div style={{ position: "relative", display: "inline-block" }}>
                         <select
                           value={userAgencyFilter}
                           onChange={(e) => {
                             setUserAgencyFilter(e.target.value);
                             setCurrentPage(1);
                           }}
                           style={{ 
                             padding: "6px 24px 6px 12px", 
                             borderRadius: "4px", 
                             border: "1px solid #ddd", 
                             backgroundColor: "white", 
                             color: "#333", 
                             fontSize: "14px", 
                             cursor: "pointer",
                             appearance: "none",
                             WebkitAppearance: "none",
                             MozAppearance: "none"
                           }}
                         >
                           <option value="all">Tous</option>
                           {uniqueAgencies.map((agency) => (
                             <option key={agency} value={agency}>{agency}</option>
                           ))}
                         </select>
                         <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#666", pointerEvents: "none" }}>▼</span>
                       </div>
                     </div>
                   </div>
                 </div>
                 
                 {/* Recherche */}
                 <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                   <span style={{ color: "#333", fontWeight: "500" }}>Rechercher :</span>
                   <input
                     type="text"
                     value={searchQuery}
                     onChange={(e) => {
                       setSearchQuery(e.target.value);
                       setCurrentPage(1);
                     }}
                     placeholder="🔍 Rechercher un utilisateur..."
                     style={{ flex: 1, maxWidth: "400px", padding: "8px 12px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px" }}
                   />
                 </div>
                 
                 {/* Tableau des utilisateurs */}
                 <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", border: "1px solid #e0e0e0" }}>
                   <thead>
                     <tr style={{ background: "#f8f9fa" }}>
                       <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontWeight: "600" }}>ID</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontWeight: "600" }}>Nom</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontWeight: "600" }}>Email</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontWeight: "600" }}>Rôle</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontWeight: "600" }}>Statut</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid #dee2e6", fontWeight: "600" }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {paginatedUsers.length === 0 ? (
                       <tr>
                         <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                           Aucun utilisateur trouvé
                         </td>
                       </tr>
                     ) : (
                       paginatedUsers.map((user: any, index: number) => {
                         const isActive = user.is_active !== false;
                         const displayId = startIndex + index + 1;
                         return (
                           <tr key={user.id} style={{ borderBottom: "1px solid #eee" }}>
                             <td style={{ padding: "12px 16px" }}>{displayId}</td>
                             <td style={{ padding: "12px 16px" }}>{user.full_name || "N/A"}</td>
                             <td style={{ padding: "12px 16px" }}>{user.email || "N/A"}</td>
                             <td style={{ padding: "12px 16px" }}>{user.role?.name || "N/A"}</td>
                             <td style={{ padding: "12px 16px" }}>
                               {isActive ? (
                                 <span style={{ color: "#28a745", fontWeight: "500" }}>Actif ✓</span>
                               ) : (
                                 <span style={{ color: "#dc3545", fontWeight: "500" }}>Inactif ❌</span>
                               )}
                             </td>
                             <td style={{ padding: "12px 16px" }}>
                               <div style={{ display: "flex", gap: "8px" }}>
                                 <button
                                   onClick={() => handleEditUser(user)}
                                   style={{ 
                                     padding: "8px 16px", 
                                     backgroundColor: "#17a2b8", 
                                     border: "none", 
                                     borderRadius: "4px", 
                                     cursor: "pointer", 
                                     fontSize: "14px",
                                     color: "white",
                                     fontWeight: "500"
                                   }}
                                 >
                                   Modifier
                                 </button>
                                 <button
                                   onClick={() => {
                                     if (confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${user.full_name} ?`)) {
                                       // TODO: Implémenter la réinitialisation du mot de passe
                                       alert(`Réinitialisation du mot de passe pour ${user.full_name}`);
                                     }
                                   }}
                                   style={{ 
                                     padding: "8px 16px", 
                                     backgroundColor: "#ff9800", 
                                     border: "none", 
                                     borderRadius: "4px", 
                                     cursor: "pointer", 
                                     fontSize: "14px",
                                     color: "white",
                                     fontWeight: "500"
                                   }}
                                 >
                                   Réinitialiser
                                 </button>
                                 <button
                                   onClick={() => {
                                     if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.full_name} ? Cette action est irréversible.`)) {
                                       // TODO: Implémenter la suppression
                                       alert(`Suppression de l'utilisateur ${user.full_name}`);
                                     }
                                   }}
                                   style={{ 
                                     padding: "8px 16px", 
                                     backgroundColor: "#dc3545", 
                                     border: "none", 
                                     borderRadius: "4px", 
                                     cursor: "pointer", 
                                     fontSize: "14px",
                                     color: "white",
                                     fontWeight: "500"
                                   }}
                                 >
                                   Supprimer
                                 </button>
                               </div>
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
                 
                 {/* Pagination */}
                 <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
                   <span style={{ color: "#333", fontWeight: "500" }}>Pagination :</span>
                   <button
                     onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                     disabled={currentPage === 1}
                     style={{ padding: "6px 12px", backgroundColor: currentPage === 1 ? "#e0e0e0" : "#007bff", color: currentPage === 1 ? "#999" : "white", border: "none", borderRadius: "4px", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "14px" }}
                   >
                     [&lt; Précédent]
                   </button>
                   <span style={{ color: "#333", fontSize: "14px" }}>Page {currentPage} sur {totalPages || 1}</span>
                   <button
                     onClick={() => setCurrentPage(prev => Math.min(totalPages || 1, prev + 1))}
                     disabled={currentPage >= (totalPages || 1)}
                     style={{ padding: "6px 12px", backgroundColor: currentPage >= (totalPages || 1) ? "#e0e0e0" : "#007bff", color: currentPage >= (totalPages || 1) ? "#999" : "white", border: "none", borderRadius: "4px", cursor: currentPage >= (totalPages || 1) ? "not-allowed" : "pointer", fontSize: "14px" }}
                   >
                     [Suivant &gt;]
                   </button>
                 </div>
               </>
             );
           })()}

           {activeSection === "apparence" && (
               <div style={{ padding: "24px" }}>
                 <h1 style={{ marginBottom: "32px", fontSize: "28px", fontWeight: "600", color: "#333" }}>
                   Apparence
                 </h1>

                 {/* Nom de l'Application */}
                 <div style={{ 
                   marginBottom: "32px", 
                   border: "1px solid #ddd", 
                   borderRadius: "8px", 
                   padding: "24px",
                   background: "white"
                 }}>
                   <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                     Nom de l'Application
                   </h3>
                   <input
                     type="text"
                     value={localAppName}
                     onChange={(e) => setLocalAppName(e.target.value)}
                     placeholder="Système de Gestion des Tickets_______"
                     style={{
                       width: "100%",
                       padding: "12px 16px",
                       border: "1px solid #ddd",
                       borderRadius: "4px",
                       fontSize: "14px",
                       marginBottom: "8px"
                     }}
                   />
                   <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                     Ce nom apparaît dans l'en-tête de l'application
                   </p>
                 </div>

                 {/* Logo de l'Application */}
                 <div style={{ 
                   marginBottom: "32px", 
                   border: "1px solid #ddd", 
                   borderRadius: "8px", 
                   padding: "24px",
                   background: "white"
                 }}>
                   <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                     Logo de l'Application
                   </h3>
                   {localAppLogo && (
                     <div style={{ marginBottom: "12px" }}>
                       <img 
                         src={localAppLogo} 
                         alt="Logo actuel" 
                         style={{ maxWidth: "200px", maxHeight: "100px", marginBottom: "12px" }}
                       />
                     </div>
                   )}
                   <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                     {localAppLogo && (
                       <button
                         onClick={() => {
                           const newWindow = window.open();
                           if (newWindow) {
                             newWindow.document.write(`<img src="${localAppLogo}" style="max-width: 100%;" />`);
                           }
                         }}
                         style={{
                           padding: "8px 16px",
                           backgroundColor: "#f8f9fa",
                           color: "#333",
                           border: "1px solid #ddd",
                           borderRadius: "4px",
                           cursor: "pointer",
                           fontSize: "14px"
                         }}
                       >
                         [Logo actuel]
                       </button>
                     )}
                     <button
                       onClick={() => fileInputRef.current?.click()}
                       style={{
                         padding: "8px 16px",
                         backgroundColor: "#007bff",
                         color: "white",
                         border: "none",
                         borderRadius: "4px",
                         cursor: "pointer",
                         fontSize: "14px"
                       }}
                     >
                       [Télécharger nouveau logo]
                     </button>
                     <input
                       ref={fileInputRef}
                       type="file"
                       accept="image/png,image/jpeg,image/jpg"
                       onChange={handleLogoUpload}
                       style={{ display: "none" }}
                     />
                     {localAppLogo && (
                       <button
                         onClick={handleDeleteLogo}
                         style={{
                           padding: "8px 16px",
                           backgroundColor: "#dc3545",
                           color: "white",
                           border: "none",
                           borderRadius: "4px",
                           cursor: "pointer",
                           fontSize: "14px"
                         }}
                       >
                         [Supprimer]
                       </button>
                     )}
                   </div>
                   <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                     Format accepté : PNG, JPG (Max <span style={{ color: "#007bff" }}>2MB</span>)
                   </p>
                 </div>

                 {/* Thème */}
                 <div style={{ 
                   marginBottom: "32px", 
                   border: "1px solid #ddd", 
                   borderRadius: "8px", 
                   padding: "24px",
                   background: "white"
                 }}>
                   <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                     <span style={{ color: "#dc3545" }}>Thème</span>
                   </h3>
                   <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                       <input
                         type="radio"
                         name="theme"
                         value="clair"
                         checked={localAppTheme === "clair"}
                         onChange={(e) => setLocalAppTheme(e.target.value)}
                         style={{ cursor: "pointer" }}
                       />
                       <span>Clair</span>
                     </label>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                       <input
                         type="radio"
                         name="theme"
                         value="sombre"
                         checked={localAppTheme === "sombre"}
                         onChange={(e) => setLocalAppTheme(e.target.value)}
                         style={{ cursor: "pointer" }}
                       />
                       <span>Sombre</span>
                     </label>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                       <input
                         type="radio"
                         name="theme"
                         value="auto"
                         checked={localAppTheme === "auto"}
                         onChange={(e) => setLocalAppTheme(e.target.value)}
                         style={{ cursor: "pointer" }}
                       />
                       <span><span style={{ color: "#dc3545" }}>Auto</span> (selon les préférences du <span style={{ color: "#dc3545" }}>système</span>)</span>
                     </label>
                   </div>
                 </div>

                 {/* Couleur Primaire */}
                 <div style={{ 
                   marginBottom: "32px", 
                   border: "1px solid #ddd", 
                   borderRadius: "8px", 
                   padding: "24px",
                   background: "white"
                 }}>
                   <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                     Couleur Primaire
                   </h3>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                       <div style={{ 
                         width: "24px", 
                         height: "24px", 
                         backgroundColor: localPrimaryColor, 
                         borderRadius: "4px",
                         border: "1px solid #ddd"
                       }}></div>
                       <span style={{ fontSize: "14px", color: "#333" }}>[■ {getColorName(localPrimaryColor)}]</span>
                     </div>
                     <input
                       type="color"
                       value={localPrimaryColor}
                       onChange={(e) => setLocalPrimaryColor(e.target.value)}
                       style={{
                         width: "40px",
                         height: "40px",
                         border: "1px solid #ddd",
                         borderRadius: "4px",
                         cursor: "pointer"
                       }}
                     />
                     <button
                       onClick={() => setShowColorPicker(!showColorPicker)}
                       style={{
                         padding: "8px 16px",
                         backgroundColor: "#f8f9fa",
                         color: "#333",
                         border: "1px solid #ddd",
                         borderRadius: "4px",
                         cursor: "pointer",
                         fontSize: "14px"
                       }}
                     >
                       [Sélectionner une couleur]
                     </button>
                   </div>
                   {showColorPicker && (
                     <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                       {["#007bff", "#28a745", "#dc3545", "#ffc107", "#6c757d", "#17a2b8", "#ff9800", "#9c27b0"].map((color) => (
                         <div
                           key={color}
                           onClick={() => {
                             setLocalPrimaryColor(color);
                             setShowColorPicker(false);
                           }}
                           style={{
                             width: "40px",
                             height: "40px",
                             backgroundColor: color,
                             borderRadius: "4px",
                             border: localPrimaryColor === color ? "3px solid #333" : "1px solid #ddd",
                             cursor: "pointer"
                           }}
                         />
                       ))}
                     </div>
                   )}
                 </div>

                 {/* Boutons d'action */}
                 <div style={{ 
                   display: "flex", 
                   justifyContent: "flex-end", 
                   gap: "12px",
                   marginTop: "32px",
                   paddingTop: "24px",
                   borderTop: "1px solid #eee"
                 }}>
                   <button
                     onClick={handleCancelAppearance}
                     style={{
                       padding: "10px 20px",
                       backgroundColor: "#6c757d",
                       color: "white",
                       border: "none",
                       borderRadius: "4px",
                       cursor: "pointer",
                       fontSize: "14px"
                     }}
                   >
                     [Annuler]
                   </button>
                   <button
                     onClick={handleSaveAppearance}
                     style={{
                       padding: "10px 20px",
                       backgroundColor: "#28a745",
                       color: "white",
                       border: "none",
                       borderRadius: "4px",
                       cursor: "pointer",
                       fontSize: "14px"
                     }}
                   >
                     [Enregistrer]
                   </button>
                 </div>
               </div>
           )}

           {activeSection === "types-tickets" && (
             <div style={{ padding: "24px" }}>
               <h1 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>
                 Types de Tickets
               </h1>

               {/* Bouton Ajouter */}
               <div style={{ marginBottom: "24px" }}>
                 <button
                   onClick={() => {
                     setNewType({ type: "", description: "", color: "#007bff" });
                     setEditingType(null);
                     setShowAddTypeModal(true);
                   }}
                   style={{
                     padding: "10px 20px",
                     backgroundColor: "white",
                     color: "#007bff",
                     border: "1px solid #007bff",
                     borderRadius: "4px",
                     cursor: "pointer",
                     fontSize: "14px",
                     fontWeight: "500"
                   }}
                 >
                   [+ Ajouter un type]
                 </button>
               </div>

               {/* Tableau des types */}
               <div style={{ 
                 background: "white", 
                 borderRadius: "8px", 
                 boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                 overflow: "hidden"
               }}>
                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
                   <thead>
                     <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Type</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Description</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Couleur</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {ticketTypes.map((ticketType) => (
                       <tr key={ticketType.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                         <td style={{ padding: "12px 16px", color: "#333" }}>{ticketType.type}</td>
                         <td style={{ padding: "12px 16px", color: "#333" }}>
                           {ticketType.description.includes("d'accès") ? (
                             <>
                               {ticketType.description.split("d'accès")[0]}
                               <span style={{ color: "#ff9800" }}>d'accès</span>
                               {ticketType.description.split("d'accès")[1]}
                             </>
                           ) : (
                             ticketType.description
                           )}
                         </td>
                         <td style={{ padding: "12px 16px" }}>
                           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                             <div style={{
                               width: "20px",
                               height: "20px",
                               borderRadius: "50%",
                               backgroundColor: ticketType.color,
                               border: "1px solid #ddd"
                             }}></div>
                             <span style={{ color: "#333" }}>{getTypeColorName(ticketType.color)}</span>
                           </div>
                         </td>
                         <td style={{ padding: "12px 16px" }}>
                           <div style={{ display: "flex", gap: "12px" }}>
                             <button
                               onClick={() => handleEditType(ticketType.id)}
                               style={{
                                 padding: "0",
                                 backgroundColor: "transparent",
                                 border: "none",
                                 cursor: "pointer",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 width: "28px",
                                 height: "28px"
                               }}
                               title="Modifier"
                             >
                               <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                 {/* Crayon jaune */}
                                 <path d="M6 22L2 18L10 10L14 14L6 22Z" fill="#ffc107" stroke="#d4a574" strokeWidth="0.8"/>
                                 <path d="M2 18L6 22L2 22L2 18Z" fill="#d4a574"/>
                                 <path d="M10 10L14 14L10 14L10 10Z" fill="#ffeb3b"/>
                                 {/* Pointe grise */}
                                 <path d="M2 18L6 22L2 22Z" fill="#757575"/>
                                 {/* Gomme rose */}
                                 <rect x="20" y="2" width="4" height="4" rx="0.5" fill="#ffb3d9" stroke="#ff91c7" strokeWidth="0.5"/>
                                 {/* Bande métallique bleue */}
                                 <rect x="19" y="5" width="6" height="1.5" fill="#87ceeb"/>
                               </svg>
                             </button>
                             <button
                               onClick={() => handleDeleteType(ticketType.id)}
                               style={{
                                 padding: "0",
                                 backgroundColor: "transparent",
                                 border: "none",
                                 cursor: "pointer",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 width: "28px",
                                 height: "28px"
                               }}
                               title="Supprimer"
                             >
                               <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                 {/* Poubelle bleue claire avec motif grille */}
                                 <rect x="7" y="6" width="14" height="16" rx="1.5" fill="#87ceeb" stroke="#5ba3d4" strokeWidth="1.2"/>
                                 {/* Motif de grille */}
                                 <line x1="10" y1="8" x2="10" y2="20" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="14" y1="8" x2="14" y2="20" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="18" y1="8" x2="18" y2="20" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="10" x2="20" y2="10" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="13" x2="20" y2="13" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="16" x2="20" y2="16" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="19" x2="20" y2="19" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 {/* Bord supérieur */}
                                 <rect x="9" y="3" width="10" height="3" rx="0.5" fill="#5ba3d4"/>
                               </svg>
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Modal Ajouter/Modifier un type */}
               {showAddTypeModal && (
                 <div 
                   onClick={() => {
                     setShowAddTypeModal(false);
                     setEditingType(null);
                     setNewType({ type: "", description: "", color: "#007bff" });
                   }}
                   style={{
                     position: "fixed",
                     top: 0,
                     left: 0,
                     right: 0,
                     bottom: 0,
                     background: "rgba(0,0,0,0.5)",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     zIndex: 1000,
                     padding: "20px"
                   }}
                 >
                   <div 
                     onClick={(e) => e.stopPropagation()}
                     style={{
                       background: "white",
                       borderRadius: "12px",
                       width: "100%",
                       maxWidth: "500px",
                       boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                       padding: "24px"
                     }}
                   >
                     <h2 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: "600", color: "#333" }}>
                       {editingType ? "Modifier le type" : "Ajouter un type"}
                     </h2>
                     
                     <div style={{ marginBottom: "16px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Type <span style={{ color: "#dc3545" }}>*</span>
                       </label>
                       <input
                         type="text"
                         value={newType.type}
                         onChange={(e) => setNewType({ ...newType, type: e.target.value })}
                         placeholder="Ex: Matériel"
                         style={{
                           width: "100%",
                           padding: "10px 12px",
                           border: "1px solid #ddd",
                           borderRadius: "4px",
                           fontSize: "14px"
                         }}
                       />
                     </div>

                     <div style={{ marginBottom: "16px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Description <span style={{ color: "#dc3545" }}>*</span>
                       </label>
                       <input
                         type="text"
                         value={newType.description}
                         onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                         placeholder="Ex: Problèmes matériels"
                         style={{
                           width: "100%",
                           padding: "10px 12px",
                           border: "1px solid #ddd",
                           borderRadius: "4px",
                           fontSize: "14px"
                         }}
                       />
                     </div>

                     <div style={{ marginBottom: "24px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Couleur
                       </label>
                       <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                           <div style={{
                             width: "30px",
                             height: "30px",
                             borderRadius: "50%",
                             backgroundColor: newType.color,
                             border: "1px solid #ddd"
                           }}></div>
                           <input
                             type="color"
                             value={newType.color}
                             onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                             style={{
                               width: "50px",
                               height: "40px",
                               border: "1px solid #ddd",
                               borderRadius: "4px",
                               cursor: "pointer"
                             }}
                           />
                         </div>
                         <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                           {["#dc3545", "#28a745", "#ffc107", "#9c27b0", "#6c757d", "#007bff", "#17a2b8", "#ff9800"].map((color) => (
                             <div
                               key={color}
                               onClick={() => setNewType({ ...newType, color })}
                               style={{
                                 width: "30px",
                                 height: "30px",
                                 borderRadius: "50%",
                                 backgroundColor: color,
                                 border: newType.color === color ? "3px solid #333" : "1px solid #ddd",
                                 cursor: "pointer"
                               }}
                             />
                           ))}
                         </div>
                       </div>
                     </div>

                     <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                       <button
                         onClick={() => {
                           setShowAddTypeModal(false);
                           setEditingType(null);
                           setNewType({ type: "", description: "", color: "#007bff" });
                         }}
                         style={{
                           padding: "10px 20px",
                           backgroundColor: "#6c757d",
                           color: "white",
                           border: "none",
                           borderRadius: "4px",
                           cursor: "pointer",
                           fontSize: "14px"
                         }}
                       >
                         Annuler
                       </button>
                       <button
                         onClick={editingType ? handleUpdateType : handleAddType}
                         style={{
                           padding: "10px 20px",
                           backgroundColor: "#28a745",
                           color: "white",
                           border: "none",
                           borderRadius: "4px",
                           cursor: "pointer",
                           fontSize: "14px"
                         }}
                       >
                         {editingType ? "Modifier" : "Ajouter"}
                       </button>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}

           {activeSection === "priorites" && (
             <div style={{ padding: "24px" }}>
               <h1 style={{ marginBottom: "24px", fontSize: "28px", fontWeight: "600", color: "#333" }}>
                 Priorités
               </h1>

               {/* Bouton Ajouter */}
               <div style={{ marginBottom: "24px" }}>
                 <button
                   onClick={() => {
                     setNewPriority({ priority: "", level: 1, color: "#dc3545", maxTimeValue: 1, maxTimeUnit: "heure" });
                     setEditingPriority(null);
                     setShowAddPriorityModal(true);
                   }}
                   style={{
                     padding: "10px 20px",
                     backgroundColor: "white",
                     color: "#007bff",
                     border: "1px solid #007bff",
                     borderRadius: "4px",
                     cursor: "pointer",
                     fontSize: "14px",
                     fontWeight: "500"
                   }}
                 >
                   [+ Ajouter une priorité]
                 </button>
               </div>

               {/* Tableau des priorités */}
               <div style={{ 
                 background: "white", 
                 borderRadius: "8px", 
                 boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                 overflow: "hidden"
               }}>
                 <table style={{ width: "100%", borderCollapse: "collapse" }}>
                   <thead>
                     <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Priorité</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Niveau</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Couleur</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Temps Max</th>
                       <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #dee2e6" }}>Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {priorities.map((priority) => (
                       <tr key={priority.id} style={{ borderBottom: "1px solid #dee2e6" }}>
                         <td style={{ padding: "12px 16px", color: "#333" }}>{priority.priority}</td>
                         <td style={{ padding: "12px 16px", color: "#007bff", fontWeight: "500" }}>{priority.level}</td>
                         <td style={{ padding: "12px 16px" }}>
                           <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                             <div style={{
                               width: "20px",
                               height: "20px",
                               borderRadius: "50%",
                               backgroundColor: priority.color,
                               border: "1px solid #ddd"
                             }}></div>
                             <span style={{ color: "#333" }}>{getPriorityColorName(priority.color)}</span>
                           </div>
                         </td>
                         <td style={{ padding: "12px 16px" }}>
                           <span style={{ color: "#333" }}>
                             <span style={{ color: "#007bff", fontWeight: "500" }}>{priority.maxTimeValue}</span> {priority.maxTimeUnit}
                           </span>
                         </td>
                         <td style={{ padding: "12px 16px" }}>
                           <div style={{ display: "flex", gap: "12px" }}>
                             <button
                               onClick={() => handleEditPriority(priority.id)}
                               style={{
                                 padding: "0",
                                 backgroundColor: "transparent",
                                 border: "none",
                                 cursor: "pointer",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 width: "28px",
                                 height: "28px"
                               }}
                               title="Modifier"
                             >
                               <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                 {/* Crayon jaune */}
                                 <path d="M6 22L2 18L10 10L14 14L6 22Z" fill="#ffc107" stroke="#d4a574" strokeWidth="0.8"/>
                                 <path d="M2 18L6 22L2 22L2 18Z" fill="#d4a574"/>
                                 <path d="M10 10L14 14L10 14L10 10Z" fill="#ffeb3b"/>
                                 <path d="M2 18L6 22L2 22Z" fill="#757575"/>
                                 <rect x="20" y="2" width="4" height="4" rx="0.5" fill="#ffb3d9" stroke="#ff91c7" strokeWidth="0.5"/>
                                 <rect x="19" y="5" width="6" height="1.5" fill="#87ceeb"/>
                               </svg>
                             </button>
                             <button
                               onClick={() => handleDeletePriority(priority.id)}
                               style={{
                                 padding: "0",
                                 backgroundColor: "transparent",
                                 border: "none",
                                 cursor: "pointer",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 width: "28px",
                                 height: "28px"
                               }}
                               title="Supprimer"
                             >
                               <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                 {/* Poubelle bleue claire avec motif grille */}
                                 <rect x="7" y="6" width="14" height="16" rx="1.5" fill="#87ceeb" stroke="#5ba3d4" strokeWidth="1.2"/>
                                 <line x1="10" y1="8" x2="10" y2="20" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="14" y1="8" x2="14" y2="20" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="18" y1="8" x2="18" y2="20" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="10" x2="20" y2="10" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="13" x2="20" y2="13" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="16" x2="20" y2="16" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <line x1="8" y1="19" x2="20" y2="19" stroke="#5ba3d4" strokeWidth="0.6" opacity="0.7"/>
                                 <rect x="9" y="3" width="10" height="3" rx="0.5" fill="#5ba3d4"/>
                               </svg>
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Note */}
               <div style={{ marginTop: "24px", padding: "12px", background: "#f8f9fa", borderRadius: "4px" }}>
                 <p style={{ margin: 0, fontSize: "14px", color: "#666", fontStyle: "italic" }}>
                   Note : Les temps max sont utilisés pour générer des alertes
                 </p>
               </div>

               {/* Modal Ajouter/Modifier une priorité */}
               {showAddPriorityModal && (
                 <div 
                   onClick={() => {
                     setShowAddPriorityModal(false);
                     setEditingPriority(null);
                     setNewPriority({ priority: "", level: 1, color: "#dc3545", maxTimeValue: 1, maxTimeUnit: "heure" });
                   }}
                   style={{
                     position: "fixed",
                     top: 0,
                     left: 0,
                     right: 0,
                     bottom: 0,
                     background: "rgba(0,0,0,0.5)",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     zIndex: 1000,
                     padding: "20px"
                   }}
                 >
                   <div 
                     onClick={(e) => e.stopPropagation()}
                     style={{
                       background: "white",
                       borderRadius: "12px",
                       width: "100%",
                       maxWidth: "500px",
                       boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                       padding: "24px"
                     }}
                   >
                     <h2 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: "600", color: "#333" }}>
                       {editingPriority ? "Modifier la priorité" : "Ajouter une priorité"}
                     </h2>
                     
                     <div style={{ marginBottom: "16px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Priorité <span style={{ color: "#dc3545" }}>*</span>
                       </label>
                       <input
                         type="text"
                         value={newPriority.priority}
                         onChange={(e) => setNewPriority({ ...newPriority, priority: e.target.value })}
                         placeholder="Ex: Critique"
                         style={{
                           width: "100%",
                           padding: "10px 12px",
                           border: "1px solid #ddd",
                           borderRadius: "4px",
                           fontSize: "14px"
                         }}
                       />
                     </div>

                     <div style={{ marginBottom: "16px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Niveau <span style={{ color: "#dc3545" }}>*</span>
                       </label>
                       <input
                         type="number"
                         min="1"
                         value={newPriority.level}
                         onChange={(e) => setNewPriority({ ...newPriority, level: parseInt(e.target.value) || 1 })}
                         style={{
                           width: "100%",
                           padding: "10px 12px",
                           border: "1px solid #ddd",
                           borderRadius: "4px",
                           fontSize: "14px"
                         }}
                       />
                     </div>

                     <div style={{ marginBottom: "16px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Couleur
                       </label>
                       <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                           <div style={{
                             width: "30px",
                             height: "30px",
                             borderRadius: "50%",
                             backgroundColor: newPriority.color,
                             border: "1px solid #ddd"
                           }}></div>
                           <input
                             type="color"
                             value={newPriority.color}
                             onChange={(e) => setNewPriority({ ...newPriority, color: e.target.value })}
                             style={{
                               width: "50px",
                               height: "40px",
                               border: "1px solid #ddd",
                               borderRadius: "4px",
                               cursor: "pointer"
                             }}
                           />
                         </div>
                         <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                           {["#dc3545", "#ff9800", "#ffc107", "#28a745", "#007bff", "#6c757d", "#9c27b0"].map((color) => (
                             <div
                               key={color}
                               onClick={() => setNewPriority({ ...newPriority, color })}
                               style={{
                                 width: "30px",
                                 height: "30px",
                                 borderRadius: "50%",
                                 backgroundColor: color,
                                 border: newPriority.color === color ? "3px solid #333" : "1px solid #ddd",
                                 cursor: "pointer"
                               }}
                             />
                           ))}
                         </div>
                       </div>
                     </div>

                     <div style={{ marginBottom: "24px" }}>
                       <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                         Temps Max <span style={{ color: "#dc3545" }}>*</span>
                       </label>
                       <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                         <input
                           type="number"
                           min="1"
                           value={newPriority.maxTimeValue}
                           onChange={(e) => setNewPriority({ ...newPriority, maxTimeValue: parseInt(e.target.value) || 1 })}
                           style={{
                             width: "100px",
                             padding: "10px 12px",
                             border: "1px solid #ddd",
                             borderRadius: "4px",
                             fontSize: "14px"
                           }}
                         />
                         <select
                           value={newPriority.maxTimeUnit}
                           onChange={(e) => setNewPriority({ ...newPriority, maxTimeUnit: e.target.value })}
                           style={{
                             padding: "10px 12px",
                             border: "1px solid #ddd",
                             borderRadius: "4px",
                             fontSize: "14px"
                           }}
                         >
                           <option value="heure">heure</option>
                           <option value="heures">heures</option>
                           <option value="jour">jour</option>
                           <option value="jours">jours</option>
                         </select>
                       </div>
                     </div>

                     <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                       <button
                         onClick={() => {
                           setShowAddPriorityModal(false);
                           setEditingPriority(null);
                           setNewPriority({ priority: "", level: 1, color: "#dc3545", maxTimeValue: 1, maxTimeUnit: "heure" });
                         }}
                         style={{
                           padding: "10px 20px",
                           backgroundColor: "#6c757d",
                           color: "white",
                           border: "none",
                           borderRadius: "4px",
                           cursor: "pointer",
                           fontSize: "14px"
                         }}
                       >
                         Annuler
                       </button>
                       <button
                         onClick={editingPriority ? handleUpdatePriority : handleAddPriority}
                         style={{
                           padding: "10px 20px",
                           backgroundColor: "#28a745",
                           color: "white",
                           border: "none",
                           borderRadius: "4px",
                           cursor: "pointer",
                           fontSize: "14px"
                         }}
                       >
                         {editingPriority ? "Modifier" : "Ajouter"}
                       </button>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}

           {activeSection === "securite" && (
             <div style={{ padding: "24px" }}>
               <h1 style={{ marginBottom: "32px", fontSize: "28px", fontWeight: "600", color: "#333" }}>
                 Sécurité
               </h1>

               {/* Section Authentification */}
               <div style={{ 
                 marginBottom: "32px", 
                 border: "1px solid #ddd", 
                 borderRadius: "8px", 
                 padding: "24px",
                 background: "white"
               }}>
                 <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600", color: "#333" }}>
                   Authentification
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.mfaRequired}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, mfaRequired: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Authentification Multi-Facteurs (MFA) obligatoire</span>
                   </label>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     <span style={{ color: "#333", fontSize: "14px" }}>Expiration de session après</span>
                     <input
                       type="number"
                       min="1"
                       value={securitySettings.sessionTimeout}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                       style={{
                         width: "80px",
                         padding: "8px 12px",
                         border: "1px solid #ddd",
                         borderRadius: "4px",
                         fontSize: "14px",
                         textAlign: "center"
                       }}
                     />
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500" }}>{securitySettings.sessionTimeout}</span>
                     <span style={{ color: "#333", fontSize: "14px" }}>minutes d'inactivité</span>
                   </div>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.connectionHistory}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, connectionHistory: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Historique des connexions</span>
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.suspiciousConnectionAlerts}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, suspiciousConnectionAlerts: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Alertes de connexion suspecte</span>
                   </label>
                 </div>
               </div>

               {/* Section Mot de Passe */}
               <div style={{ 
                 marginBottom: "32px", 
                 border: "1px solid #ddd", 
                 borderRadius: "8px", 
                 padding: "24px",
                 background: "white"
               }}>
                 <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600", color: "#333" }}>
                   Mot de Passe
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500", minWidth: "180px" }}>Longueur minimale :</span>
                     <input
                       type="number"
                       min="1"
                       value={securitySettings.minPasswordLength}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: parseInt(e.target.value) || 8 })}
                       style={{
                         width: "80px",
                         padding: "8px 12px",
                         border: "1px solid #ddd",
                         borderRadius: "4px",
                         fontSize: "14px",
                         textAlign: "center"
                       }}
                     />
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500" }}>{securitySettings.minPasswordLength}</span>
                     <span style={{ color: "#333", fontSize: "14px" }}>caractères</span>
                   </div>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.requireUppercase}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Exiger des majuscules</span>
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.requireLowercase}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, requireLowercase: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Exiger des minuscules</span>
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.requireNumbers}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Exiger des chiffres</span>
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.requireSpecialChars}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, requireSpecialChars: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Exiger des caractères spéciaux</span>
                   </label>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500", minWidth: "180px" }}>Expiration du mot de passe :</span>
                     <input
                       type="number"
                       min="1"
                       value={securitySettings.passwordExpiration}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiration: parseInt(e.target.value) || 90 })}
                       style={{
                         width: "80px",
                         padding: "8px 12px",
                         border: "1px solid #ddd",
                         borderRadius: "4px",
                         fontSize: "14px",
                         textAlign: "center"
                       }}
                     />
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500" }}>{securitySettings.passwordExpiration}</span>
                     <span style={{ color: "#333", fontSize: "14px" }}>jours</span>
                   </div>
                 </div>
               </div>

               {/* Section Audit et Logging */}
               <div style={{ 
                 marginBottom: "32px", 
                 border: "1px solid #ddd", 
                 borderRadius: "8px", 
                 padding: "24px",
                 background: "white"
               }}>
                 <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600", color: "#333" }}>
                   Audit et Logging
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.recordAllActions}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, recordAllActions: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Enregistrer toutes les actions</span>
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.recordSensitiveDataChanges}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, recordSensitiveDataChanges: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Enregistrer les modifications de données sensibles</span>
                   </label>
                   <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                     <input
                       type="checkbox"
                       checked={securitySettings.recordFailedLogins}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, recordFailedLogins: e.target.checked })}
                       style={{ width: "18px", height: "18px", cursor: "pointer" }}
                     />
                     <span style={{ color: "#333", fontSize: "14px" }}>Enregistrer les tentatives de connexion échouées</span>
                   </label>
                   <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500", minWidth: "200px" }}>Conserver les logs pendant :</span>
                     <input
                       type="number"
                       min="1"
                       value={securitySettings.keepLogsFor}
                       onChange={(e) => setSecuritySettings({ ...securitySettings, keepLogsFor: parseInt(e.target.value) || 90 })}
                       style={{
                         width: "80px",
                         padding: "8px 12px",
                         border: "1px solid #ddd",
                         borderRadius: "4px",
                         fontSize: "14px",
                         textAlign: "center"
                       }}
                     />
                     <span style={{ color: "#007bff", fontSize: "14px", fontWeight: "500" }}>{securitySettings.keepLogsFor}</span>
                     <span style={{ color: "#333", fontSize: "14px" }}>jours</span>
                   </div>
                 </div>
               </div>

               {/* Boutons d'action */}
               <div style={{ 
                 display: "flex", 
                 justifyContent: "flex-end", 
                 gap: "12px",
                 marginTop: "32px",
                 paddingTop: "24px",
                 borderTop: "1px solid #eee"
               }}>
                 <button
                   onClick={handleCancelSecurity}
                   style={{
                     padding: "10px 20px",
                     backgroundColor: "#6c757d",
                     color: "white",
                     border: "none",
                     borderRadius: "4px",
                     cursor: "pointer",
                     fontSize: "14px"
                   }}
                 >
                   [Annuler]
                 </button>
                 <button
                   onClick={handleSaveSecurity}
                   style={{
                     padding: "10px 20px",
                     backgroundColor: "#28a745",
                     color: "white",
                     border: "none",
                     borderRadius: "4px",
                     cursor: "pointer",
                     fontSize: "14px"
                   }}
                 >
                   [Enregistrer]
                 </button>
               </div>
             </div>
           )}

           {activeSection === "rapports-settings" && (
             <div style={{ padding: "24px" }}>
               <h1 style={{ marginBottom: "32px", fontSize: "28px", fontWeight: "600", color: "#333" }}>
                 Rapports
               </h1>

               {/* Section Types de Rapports */}
               <div style={{ 
                 marginBottom: "32px", 
                 border: "1px solid #ddd", 
                 borderRadius: "8px", 
                 padding: "24px",
                 background: "white"
               }}>
                 <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600", color: "#333" }}>
                   Types de Rapports :
                 </h3>
                 <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingLeft: "8px" }}>
                   {/* Rapports de Performance */}
                   <div 
                     onClick={() => {
                       setSelectedReportType("performance");
                       alert("Génération du rapport de performance (à implémenter)");
                     }}
                     style={{ 
                       display: "flex", 
                       alignItems: "center", 
                       gap: "12px", 
                       position: "relative",
                       cursor: "pointer",
                       padding: "8px",
                       borderRadius: "4px",
                       transition: "background 0.2s",
                       background: selectedReportType === "performance" ? "#f0f8ff" : "transparent"
                     }}
                     onMouseEnter={(e) => {
                       if (selectedReportType !== "performance") {
                         e.currentTarget.style.background = "#f8f9fa";
                       }
                     }}
                     onMouseLeave={(e) => {
                       if (selectedReportType !== "performance") {
                         e.currentTarget.style.background = "transparent";
                       }
                     }}
                   >
                     <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                       <div style={{ position: "absolute", left: "-8px", top: "50%", width: "8px", height: "2px", background: "#007bff", transform: "translateY(-50%)" }}></div>
                       <div style={{ position: "absolute", left: "0", top: "0", width: "2px", height: "16px", background: "#007bff" }}></div>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                         <rect x="3" y="12" width="4" height="8" fill="#007bff"/>
                         <rect x="9" y="8" width="4" height="12" fill="#28a745"/>
                         <line x1="3" y1="20" x2="19" y2="20" stroke="#333" strokeWidth="2"/>
                         <line x1="3" y1="20" x2="3" y2="12" stroke="#333" strokeWidth="2"/>
                       </svg>
                     </div>
                     <span style={{ color: "#333", fontSize: "14px" }}>Rapports de Performance</span>
                   </div>

                   {/* Rapports Utilisateurs */}
                   <div 
                     onClick={() => {
                       setSelectedReportType("utilisateurs");
                       alert("Génération du rapport utilisateurs (à implémenter)");
                     }}
                     style={{ 
                       display: "flex", 
                       alignItems: "center", 
                       gap: "12px", 
                       position: "relative",
                       cursor: "pointer",
                       padding: "8px",
                       borderRadius: "4px",
                       transition: "background 0.2s",
                       background: selectedReportType === "utilisateurs" ? "#f0f8ff" : "transparent"
                     }}
                     onMouseEnter={(e) => {
                       if (selectedReportType !== "utilisateurs") {
                         e.currentTarget.style.background = "#f8f9fa";
                       }
                     }}
                     onMouseLeave={(e) => {
                       if (selectedReportType !== "utilisateurs") {
                         e.currentTarget.style.background = "transparent";
                       }
                     }}
                   >
                     <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                       <div style={{ position: "absolute", left: "-8px", top: "50%", width: "8px", height: "2px", background: "#007bff", transform: "translateY(-50%)" }}></div>
                       <div style={{ position: "absolute", left: "0", top: "0", width: "2px", height: "32px", background: "#007bff" }}></div>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                         <circle cx="12" cy="8" r="3" fill="#007bff"/>
                         <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="#007bff" strokeWidth="2"/>
                         <circle cx="20" cy="8" r="3" fill="#007bff"/>
                         <path d="M18 21v-2a4 4 0 0 1 4-4h2" stroke="#007bff" strokeWidth="2"/>
                       </svg>
                     </div>
                     <span style={{ color: "#333", fontSize: "14px" }}>Rapports Utilisateurs</span>
                   </div>

                   {/* Rapports Tickets */}
                   <div 
                     onClick={() => {
                       setSelectedReportType("tickets");
                       alert("Génération du rapport tickets (à implémenter)");
                     }}
                     style={{ 
                       display: "flex", 
                       alignItems: "center", 
                       gap: "12px", 
                       position: "relative",
                       cursor: "pointer",
                       padding: "8px",
                       borderRadius: "4px",
                       transition: "background 0.2s",
                       background: selectedReportType === "tickets" ? "#f0f8ff" : "transparent"
                     }}
                     onMouseEnter={(e) => {
                       if (selectedReportType !== "tickets") {
                         e.currentTarget.style.background = "#f8f9fa";
                       }
                     }}
                     onMouseLeave={(e) => {
                       if (selectedReportType !== "tickets") {
                         e.currentTarget.style.background = "transparent";
                       }
                     }}
                   >
                     <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                       <div style={{ position: "absolute", left: "-8px", top: "50%", width: "8px", height: "2px", background: "#007bff", transform: "translateY(-50%)" }}></div>
                       <div style={{ position: "absolute", left: "0", top: "0", width: "2px", height: "32px", background: "#007bff" }}></div>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                         <rect x="4" y="6" width="16" height="12" rx="2" fill="#ffc107" stroke="#333" strokeWidth="1.5"/>
                         <line x1="8" y1="10" x2="16" y2="10" stroke="#333" strokeWidth="1.5"/>
                       </svg>
                     </div>
                     <span style={{ color: "#333", fontSize: "14px" }}>Rapports Tickets</span>
                   </div>

                   {/* Rapports Techniciens */}
                   <div 
                     onClick={() => {
                       setSelectedReportType("techniciens");
                       alert("Génération du rapport techniciens (à implémenter)");
                     }}
                     style={{ 
                       display: "flex", 
                       alignItems: "center", 
                       gap: "12px", 
                       position: "relative",
                       cursor: "pointer",
                       padding: "8px",
                       borderRadius: "4px",
                       transition: "background 0.2s",
                       background: selectedReportType === "techniciens" ? "#f0f8ff" : "transparent"
                     }}
                     onMouseEnter={(e) => {
                       if (selectedReportType !== "techniciens") {
                         e.currentTarget.style.background = "#f8f9fa";
                       }
                     }}
                     onMouseLeave={(e) => {
                       if (selectedReportType !== "techniciens") {
                         e.currentTarget.style.background = "transparent";
                       }
                     }}
                   >
                     <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                       <div style={{ position: "absolute", left: "-8px", top: "50%", width: "8px", height: "2px", background: "#007bff", transform: "translateY(-50%)" }}></div>
                       <div style={{ position: "absolute", left: "0", top: "0", width: "2px", height: "32px", background: "#007bff" }}></div>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                         <polyline points="3 17 7 13 12 18 21 9" stroke="#dc3545" strokeWidth="2" fill="none"/>
                         <polyline points="12 18 12 3" stroke="#28a745" strokeWidth="2" fill="none"/>
                         <path d="M3 17l4-4 5 5 9-9" stroke="#28a745" strokeWidth="2" fill="none"/>
                       </svg>
                     </div>
                     <span style={{ color: "#333", fontSize: "14px" }}>Rapports Techniciens</span>
                   </div>

                   {/* Audit et Logs */}
                   <div 
                     onClick={() => {
                       setSelectedReportType("audit");
                       alert("Génération du rapport audit et logs (à implémenter)");
                     }}
                     style={{ 
                       display: "flex", 
                       alignItems: "center", 
                       gap: "12px", 
                       position: "relative",
                       cursor: "pointer",
                       padding: "8px",
                       borderRadius: "4px",
                       transition: "background 0.2s",
                       background: selectedReportType === "audit" ? "#f0f8ff" : "transparent"
                     }}
                     onMouseEnter={(e) => {
                       if (selectedReportType !== "audit") {
                         e.currentTarget.style.background = "#f8f9fa";
                       }
                     }}
                     onMouseLeave={(e) => {
                       if (selectedReportType !== "audit") {
                         e.currentTarget.style.background = "transparent";
                       }
                     }}
                   >
                     <div style={{ position: "relative", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                       <div style={{ position: "absolute", left: "-8px", top: "50%", width: "8px", height: "2px", background: "#007bff", transform: "translateY(-50%)" }}></div>
                       <div style={{ position: "absolute", left: "0", top: "0", width: "2px", height: "16px", background: "#007bff" }}></div>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: "relative", zIndex: 1 }}>
                         <circle cx="11" cy="11" r="8" stroke="#007bff" strokeWidth="2" fill="none"/>
                         <path d="M21 21l-4.35-4.35" stroke="#007bff" strokeWidth="2"/>
                       </svg>
                     </div>
                     <span style={{ color: "#333", fontSize: "14px" }}>Audit et Logs</span>
                   </div>
                 </div>
               </div>

               {/* Section Rapports Récents */}
               <div style={{ 
                 marginBottom: "32px", 
                 border: "1px solid #ddd", 
                 borderRadius: "8px", 
                 padding: "24px",
                 background: "white"
               }}>
                 <h3 style={{ marginBottom: "20px", fontSize: "20px", fontWeight: "600", color: "#333" }}>
                   Rapports Récents :
                 </h3>
                 <div style={{ 
                   border: "1px solid #007bff", 
                   borderRadius: "4px",
                   overflow: "hidden"
                 }}>
                   <table style={{ width: "100%", borderCollapse: "collapse" }}>
                     <thead>
                       <tr style={{ background: "#f8f9fa" }}>
                         <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #007bff", borderRight: "1px solid #007bff" }}>Rapport</th>
                         <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #007bff", borderRight: "1px solid #007bff" }}>Généré par</th>
                         <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #007bff", borderRight: "1px solid #007bff" }}>Date</th>
                         <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", color: "#333", borderBottom: "1px solid #007bff" }}>Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {recentReports.map((report) => (
                         <tr key={report.id} style={{ borderBottom: "1px solid #007bff" }}>
                           <td style={{ padding: "12px 16px", borderRight: "1px solid #007bff" }}>
                             {report.report === "Performance Janvier 2024" ? (
                               <>
                                 <span style={{ color: "#333" }}>Performance</span>{" "}
                                 <span style={{ color: "#007bff" }}>Janvier 2024</span>
                               </>
                             ) : (
                               <span style={{ color: "#333" }}>{report.report}</span>
                             )}
                           </td>
                           <td style={{ padding: "12px 16px", color: "#333", borderRight: "1px solid #007bff" }}>{report.generatedBy}</td>
                           <td style={{ padding: "12px 16px", color: "#007bff", borderRight: "1px solid #007bff" }}>{report.date}</td>
                           <td style={{ padding: "12px 16px" }}>
                             <div style={{ display: "flex", gap: "12px" }}>
                               <button
                                 style={{
                                   padding: "0",
                                   backgroundColor: "transparent",
                                   border: "none",
                                   cursor: "pointer",
                                   display: "flex",
                                   alignItems: "center",
                                   justifyContent: "center",
                                   width: "24px",
                                   height: "24px"
                                 }}
                                 title="Voir"
                               >
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bff" strokeWidth="2">
                                   <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                   <circle cx="12" cy="12" r="3"/>
                                 </svg>
                               </button>
                               <button
                                 style={{
                                   padding: "0",
                                   backgroundColor: "transparent",
                                   border: "none",
                                   cursor: "pointer",
                                   display: "flex",
                                   alignItems: "center",
                                   justifyContent: "center",
                                   width: "24px",
                                   height: "24px"
                                 }}
                                 title="Télécharger"
                               >
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b4513" strokeWidth="2">
                                   <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                   <polyline points="7 10 12 15 17 10"/>
                                   <line x1="12" y1="15" x2="12" y2="3"/>
                                 </svg>
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>

               {/* Bouton Générer un nouveau rapport */}
               <div style={{ marginBottom: "24px" }}>
                 <button
                   onClick={() => {
                     alert("Génération d'un nouveau rapport (à implémenter)");
                   }}
                   style={{
                     padding: "10px 20px",
                     backgroundColor: "transparent",
                     color: "#333",
                     border: "none",
                     borderRadius: "4px",
                     cursor: "pointer",
                     fontSize: "14px",
                     fontWeight: "500"
                   }}
                 >
                   [+ Générer un nouveau rapport]
                 </button>
               </div>
             </div>
           )}

         </div>
       </div>

       {/* Modal Ajouter un utilisateur */}
       {showAddUserModal && (
         <div 
           onClick={() => setShowAddUserModal(false)}
           style={{
             position: "fixed",
             top: 0,
             left: 0,
             right: 0,
             bottom: 0,
             background: "rgba(0,0,0,0.5)",
             display: "flex",
             alignItems: "center",
             justifyContent: "center",
             zIndex: 1000,
             padding: "20px"
           }}
         >
           <div 
             onClick={(e) => e.stopPropagation()}
             style={{
               background: "white",
               borderRadius: "12px",
               width: "100%",
               maxWidth: "600px",
               maxHeight: "90vh",
               overflowY: "auto",
               boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
               padding: "24px"
             }}
           >
             <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#333" }}>Ajouter un utilisateur</h2>
               <button
                 onClick={() => setShowAddUserModal(false)}
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

             <form onSubmit={(e) => {
               e.preventDefault();
               // TODO: Implémenter la création de l'utilisateur
               alert("Création de l'utilisateur (à implémenter)");
               setShowAddUserModal(false);
             }}>
               {/* Informations Personnelles */}
               <div style={{ marginBottom: "24px" }}>
                 <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Informations Personnelles</h3>
                 <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Nom Complet <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <input
                       type="text"
                       required
                       value={newUser.full_name}
                       onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                       placeholder="Nom complet"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Email <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <input
                       type="email"
                       required
                       value={newUser.email}
                       onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                       placeholder="email@example.com"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Numéro de Téléphone
                     </label>
                     <input
                       type="tel"
                       value={newUser.phone}
                       onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                       placeholder="Numéro de téléphone"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Département <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <select
                       required
                       value={newUser.agency}
                       onChange={(e) => setNewUser({ ...newUser, agency: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                     >
                       <option value="">Sélectionner un département</option>
                       {Array.from(new Set(allUsers.map((u: any) => u.agency).filter(Boolean))).map((agency) => (
                         <option key={agency} value={agency}>{agency}</option>
                       ))}
                       <option value="Marketing">Marketing</option>
                       <option value="IT">IT</option>
                       <option value="Ressources Humaines">Ressources Humaines</option>
                       <option value="Finance">Finance</option>
                       <option value="Ventes">Ventes</option>
                     </select>
                   </div>
                 </div>
               </div>

               {/* Rôle et Permissions */}
               <div style={{ marginBottom: "24px" }}>
                 <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Rôle et Permissions</h3>
                 <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", borderLeft: "4px solid #007bff" }}>
                   <div style={{ marginBottom: "20px" }}>
                     <label style={{ display: "block", marginBottom: "12px", color: "#333", fontWeight: "500" }}>
                       Rôle <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                       {["Utilisateur", "Technicien (Matériel)", "Technicien (Applicatif)", "Secrétaire DSI", "Adjoint DSI", "DSI", "Administrateur"].map((role) => (
                         <label key={role} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                           <input
                             type="radio"
                             name="role"
                             value={role}
                             checked={newUser.role === role}
                             onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                             required
                             style={{ cursor: "pointer" }}
                           />
                           <span>{role}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                   <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
                     <label style={{ display: "block", marginBottom: "12px", color: "#333", fontWeight: "500" }}>
                       Statut <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                       {["Actif", "Inactif"].map((status) => (
                         <label key={status} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                           <input
                             type="radio"
                             name="status"
                             value={status.toLowerCase()}
                             checked={newUser.status === status.toLowerCase()}
                             onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                             required
                             style={{ cursor: "pointer" }}
                           />
                           <span>{status}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>

               {/* Mot de Passe */}
               <div style={{ marginBottom: "24px" }}>
                 <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Mot de Passe</h3>
                 <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Mot de Passe <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <input
                       type="password"
                       required={!newUser.generateRandomPassword}
                       disabled={newUser.generateRandomPassword}
                       value={newUser.password}
                       onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", backgroundColor: newUser.generateRandomPassword ? "#f5f5f5" : "white" }}
                       placeholder="Mot de passe"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Confirmer le Mot de Passe <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <input
                       type="password"
                       required={!newUser.generateRandomPassword}
                       disabled={newUser.generateRandomPassword}
                       value={newUser.confirmPassword}
                       onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px", backgroundColor: newUser.generateRandomPassword ? "#f5f5f5" : "white" }}
                       placeholder="Confirmer le mot de passe"
                     />
                   </div>
                   <div style={{ marginBottom: "12px" }}>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                       <input
                         type="checkbox"
                         checked={newUser.generateRandomPassword}
                         onChange={(e) => setNewUser({ ...newUser, generateRandomPassword: e.target.checked })}
                         style={{ cursor: "pointer" }}
                       />
                       <span>Générer un mot de passe aléatoire</span>
                     </label>
                   </div>
                   <div>
                     <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                       <input
                         type="checkbox"
                         checked={newUser.sendEmail}
                         onChange={(e) => setNewUser({ ...newUser, sendEmail: e.target.checked })}
                         style={{ cursor: "pointer" }}
                       />
                       <span>Envoyer les identifiants par email</span>
                     </label>
                   </div>
                 </div>
               </div>

               {/* Boutons d'action */}
               <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                 <button
                   type="button"
                   onClick={() => {
                     setShowAddUserModal(false);
                     setNewUser({
                       full_name: "",
                       email: "",
                       phone: "",
                       agency: "",
                       role: "",
                       status: "actif",
                       password: "",
                       confirmPassword: "",
                       generateRandomPassword: true,
                       sendEmail: true
                     });
                   }}
                   style={{ 
                     padding: "10px 20px", 
                     backgroundColor: "#6c757d", 
                     color: "white", 
                     border: "none", 
                     borderRadius: "4px", 
                     cursor: "pointer", 
                     fontSize: "14px"
                   }}
                 >
                   [Annuler]
                 </button>
                 <button
                   type="submit"
                   style={{ 
                     padding: "10px 20px", 
                     backgroundColor: "#28a745", 
                     color: "white", 
                     border: "none", 
                     borderRadius: "4px", 
                     cursor: "pointer", 
                     fontSize: "14px"
                   }}
                 >
                   [Créer Utilisateur]
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Modal Modifier un utilisateur */}
       {showEditUserModal && editingUser && (
         <div 
           onClick={() => {
             setShowEditUserModal(false);
             setEditingUser(null);
           }}
           style={{
             position: "fixed",
             top: 0,
             left: 0,
             right: 0,
             bottom: 0,
             background: "rgba(0,0,0,0.5)",
             display: "flex",
             alignItems: "center",
             justifyContent: "center",
             zIndex: 1000,
             padding: "20px"
           }}
         >
           <div 
             onClick={(e) => e.stopPropagation()}
             style={{
               background: "white",
               borderRadius: "12px",
               width: "100%",
               maxWidth: "600px",
               maxHeight: "90vh",
               overflowY: "auto",
               boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
               padding: "24px"
             }}
           >
             <div style={{ marginBottom: "24px" }}>
               <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                 MODIFIER L'UTILISATEUR
               </h2>
               <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                 {editingUser.full_name || editingUser.name} (ID: {editingUser.id || editingUser.user_id})
               </p>
             </div>

             <div style={{ borderTop: "1px solid #ddd", marginBottom: "24px" }}></div>

             <form onSubmit={(e) => {
               e.preventDefault();
               // TODO: Implémenter la modification de l'utilisateur
               alert("Modification de l'utilisateur (à implémenter)");
               setShowEditUserModal(false);
               setEditingUser(null);
             }}>
               {/* Informations Personnelles */}
               <div style={{ marginBottom: "24px" }}>
                 <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Informations Personnelles</h3>
                 <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Nom Complet <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <input
                       type="text"
                       required
                       value={editUser.full_name}
                       onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                       placeholder="Nom complet"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Email <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <input
                       type="email"
                       required
                       value={editUser.email}
                       onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                       placeholder="email@example.com"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Numéro de Téléphone
                     </label>
                     <input
                       type="tel"
                       value={editUser.phone || ""}
                       onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                       placeholder="Numéro de téléphone"
                     />
                   </div>
                   <div style={{ marginBottom: "16px" }}>
                     <label style={{ display: "block", marginBottom: "8px", color: "#333", fontWeight: "500" }}>
                       Département <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <select
                       required
                       value={editUser.agency}
                       onChange={(e) => setEditUser({ ...editUser, agency: e.target.value })}
                       style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: "4px", fontSize: "14px" }}
                     >
                       <option value="">Sélectionner un département</option>
                       {Array.from(new Set(allUsers.map((u: any) => u.agency).filter(Boolean))).map((agency) => (
                         <option key={agency} value={agency}>{agency}</option>
                       ))}
                       <option value="Marketing">Marketing</option>
                       <option value="IT">IT</option>
                       <option value="Ressources Humaines">Ressources Humaines</option>
                       <option value="Finance">Finance</option>
                       <option value="Ventes">Ventes</option>
                     </select>
                   </div>
                 </div>
               </div>

               {/* Rôle et Permissions */}
               <div style={{ marginBottom: "24px" }}>
                 <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Rôle et Permissions</h3>
                 <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", borderLeft: "4px solid #007bff" }}>
                   <div style={{ marginBottom: "20px" }}>
                     <label style={{ display: "block", marginBottom: "12px", color: "#333", fontWeight: "500" }}>
                       Rôle <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                       {["Utilisateur", "Technicien (Matériel)", "Technicien (Applicatif)", "Secrétaire DSI", "Adjoint DSI", "DSI", "Administrateur"].map((role) => (
                         <label key={role} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                           <input
                             type="radio"
                             name="editRole"
                             value={role}
                             checked={editUser.role === role}
                             onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                             required
                             style={{ cursor: "pointer" }}
                           />
                           <span>{role}{editUser.role === role ? " (Sélectionné)" : ""}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                   <div style={{ borderTop: "1px solid #eee", paddingTop: "16px" }}>
                     <label style={{ display: "block", marginBottom: "12px", color: "#333", fontWeight: "500" }}>
                       Statut <span style={{ color: "#dc3545" }}>*</span>
                     </label>
                     <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                       {["Actif", "Inactif"].map((status) => (
                         <label key={status} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                           <input
                             type="radio"
                             name="editStatus"
                             value={status.toLowerCase()}
                             checked={editUser.status === status.toLowerCase()}
                             onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                             required
                             style={{ cursor: "pointer" }}
                           />
                           <span>{status}{editUser.status === status.toLowerCase() ? " (Sélectionné)" : ""}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>

               {/* Historique */}
               <div style={{ marginBottom: "24px" }}>
                 <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600", color: "#333" }}>Historique</h3>
                 <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
                   <div style={{ marginBottom: "8px", paddingLeft: "8px", borderLeft: "2px solid #007bff" }}>
                     <div style={{ fontSize: "14px", color: "#333" }}>
                       Créé le : {editingUser.created_at ? new Date(editingUser.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " à " + new Date(editingUser.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                     </div>
                   </div>
                   <div style={{ marginBottom: "8px", paddingLeft: "8px", borderLeft: "2px solid #007bff" }}>
                     <div style={{ fontSize: "14px", color: "#333" }}>
                       Modifié le : {editingUser.updated_at ? new Date(editingUser.updated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " à " + new Date(editingUser.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                     </div>
                   </div>
                   <div style={{ paddingLeft: "8px", borderLeft: "2px solid #007bff" }}>
                     <div style={{ fontSize: "14px", color: "#333" }}>
                       Dernière connexion : {editingUser.last_login ? new Date(editingUser.last_login).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " à " + new Date(editingUser.last_login).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "N/A"}
                     </div>
                   </div>
                 </div>
               </div>

               {/* Boutons d'action */}
               <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "16px" }}>
                 <button
                   type="button"
                   onClick={() => {
                     setShowEditUserModal(false);
                     setEditingUser(null);
                   }}
                   style={{ 
                     padding: "10px 20px", 
                     backgroundColor: "#6c757d", 
                     color: "white", 
                     border: "none", 
                     borderRadius: "4px", 
                     cursor: "pointer", 
                     fontSize: "14px"
                   }}
                 >
                   [Annuler]
                 </button>
                 <button
                   type="submit"
                   style={{ 
                     padding: "10px 20px", 
                     backgroundColor: "#28a745", 
                     color: "white", 
                     border: "none", 
                     borderRadius: "4px", 
                     cursor: "pointer", 
                     fontSize: "14px"
                   }}
                 >
                   [Enregistrer Modifications]
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

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
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read) {
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DSIDashboard;

