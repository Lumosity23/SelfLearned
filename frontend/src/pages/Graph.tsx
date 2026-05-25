import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainSidebar } from '../components/MainSidebar';
import { Brain, BookOpen, Tag, Info, Search, RotateCcw, Activity, Loader2 } from 'lucide-react';
import { useToast } from '../components/ToastProvider';

interface GraphNode {
  id: string;
  label: string;
  description: string;
  tags: string[];
  group: string;
  // Physics properties
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fx?: number | null; // Fixed coordinates if dragging
  fy?: number | null;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
  common_tags: string[];
  // Resolved node objects for easy lookup
  sourceNode?: GraphNode;
  targetNode?: GraphNode;
}

export const Graph: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [rawNodes, setRawNodes] = useState<any[]>([]);
  const [rawLinks, setRawLinks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI Inspector states
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Zoom and Pan states
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Physics settings (Euler integration)
  const repulsion = 400; // Coulomb repulsion constant
  const attraction = 0.04; // Hooke's attraction constant
  const restLength = 120; // Natural link distance
  const gravity = 0.03; // Pull force to center
  const friction = 0.85; // Damping factor

  // Node physics references to avoid recreation in render loop
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  
  // Track animation frame
  const animationFrameIdRef = useRef<number | null>(null);

  // Load Graph Data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/graph');
        if (res.ok) {
          const data = await res.json();
          setRawNodes(data.nodes || []);
          setRawLinks(data.links || []);
        } else {
          throw new Error('Impossible de charger le graphe de connaissances');
        }
      } catch (err: any) {
        console.error(err);
        addToast({
          title: 'Erreur',
          description: err.message || 'Impossible de charger la vue du graphe.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGraphData();
  }, []);

  // Initialize physics nodes when raw nodes and links load
  useEffect(() => {
    if (rawNodes.length === 0) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    // Map raw nodes to physics nodes with random initial coordinates near center
    const physicsNodes: GraphNode[] = rawNodes.map((n, idx) => {
      const angle = (idx / rawNodes.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 50;
      
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 12 + Math.min(n.tags.length * 2, 8),
        fx: null,
        fy: null
      };
    });

    // Map raw links and bind source/target node references
    const physicsLinks: GraphLink[] = rawLinks.map(l => {
      const sourceNode = physicsNodes.find(n => n.id === l.source);
      const targetNode = physicsNodes.find(n => n.id === l.target);
      return {
        ...l,
        sourceNode,
        targetNode
      };
    }).filter(l => l.sourceNode && l.targetNode);

    nodesRef.current = physicsNodes;
    linksRef.current = physicsLinks;

    // Reset view settings
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  }, [rawNodes, rawLinks]);

  // Main Physics Simulation and Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-resolution back buffer
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    
    // Physics and Draw Loop
    const tick = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      const center = { x: width / 2, y: height / 2 };

      if (nodes.length > 0) {
        // --- 1. PHYSICS UPDATE ---
        // A. Coulomb Repulsion
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 1.0;
            const dist = Math.sqrt(distSq);

            if (dist < 400) {
              const force = (repulsion * 100) / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }

        // B. Hooke's Attraction
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          const n1 = link.sourceNode!;
          const n2 = link.targetNode!;
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
          
          const force = attraction * (dist - restLength);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }

        // C. Central Gravity
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          const dx = center.x - n.x;
          const dy = center.y - n.y;
          n.vx += dx * gravity;
          n.vy += dy * gravity;
        }

        // D. Apply velocity & friction to update coordinates
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          
          if (n.fx !== null && n.fx !== undefined && n.fy !== null && n.fy !== undefined) {
            n.x = n.fx;
            n.y = n.fy;
            n.vx = 0;
            n.vy = 0;
          } else {
            n.vx *= friction;
            n.vy *= friction;
            n.x += n.vx;
            n.y += n.vy;
          }
        }
      }

      // --- 2. DRAW GRAPH ---
      // Background fill matching zinc-950 of the application
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Save standard context, apply Zoom & Pan transform
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw infinite grid lines inside world coordinates
      ctx.strokeStyle = '#18181b'; // zinc-900 grid lines
      ctx.lineWidth = 0.5;
      const gridSpacing = 60;
      const startX = Math.floor((-pan.x) / zoom / gridSpacing) * gridSpacing;
      const endX = startX + (width / zoom) + gridSpacing * 2;
      const startY = Math.floor((-pan.y) / zoom / gridSpacing) * gridSpacing;
      const endY = startY + (height / zoom) + gridSpacing * 2;

      for (let x = startX; x < endX; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }

      for (let y = startY; y < endY; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // A. DRAW LINKS (Edges)
      links.forEach(link => {
        const n1 = link.sourceNode!;
        const n2 = link.targetNode!;

        const isHovered = hoveredNode && (hoveredNode.id === n1.id || hoveredNode.id === n2.id);
        const isSelected = selectedNode && (selectedNode.id === n1.id || selectedNode.id === n2.id);

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);

        if (isHovered) {
          ctx.strokeStyle = '#52525b'; // Highlight links on hover in zinc-600
          ctx.lineWidth = 1.5;
        } else if (isSelected) {
          ctx.strokeStyle = '#3f3f46'; // zinc-700 for selection links
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = '#18181b'; // zinc-900 subtle connection line
          ctx.lineWidth = 0.8;
        }
        ctx.stroke();
      });

      // B. DRAW NODES
      nodes.forEach(n => {
        const isHovered = hoveredNode && hoveredNode.id === n.id;
        const isSelected = selectedNode && selectedNode.id === n.id;
        const matchesSearch = searchQuery.trim() !== '' && n.label.toLowerCase().includes(searchQuery.toLowerCase());

        // Node circle filling in clean zinc shades
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        
        ctx.fillStyle = isHovered ? '#3f3f46' : '#27272a'; // zinc-700 when hovered, zinc-800 by default
        ctx.fill();

        // Node Glow halos / highlights
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
        if (isHovered) {
          ctx.strokeStyle = '#71717a'; // zinc-500 border
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (isSelected) {
          ctx.strokeStyle = '#52525b'; // zinc-600 border
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (matchesSearch) {
          ctx.strokeStyle = '#f59e0b'; // Keep the search highlight in amber to be visible
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#18181b'; // zinc-900 border
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        // C. DRAW LABELS
        ctx.font = isHovered ? 'bold 10px sans-serif' : '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Draw shadow/halo background for text legibility
        ctx.fillStyle = '#09090b';
        ctx.fillText(n.label, n.x - 1, n.y + n.radius + 6);
        ctx.fillText(n.label, n.x + 1, n.y + n.radius + 6);
        ctx.fillText(n.label, n.x, n.y + n.radius + 5);
        ctx.fillText(n.label, n.x, n.y + n.radius + 7);

        // Core text
        ctx.fillStyle = isHovered ? '#ffffff' : matchesSearch ? '#f59e0b' : '#a1a1aa'; // white on hover, zinc-400 else
        ctx.fillText(n.label, n.x, n.y + n.radius + 6);
      });

      ctx.restore();

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [zoom, pan, hoveredNode, selectedNode, searchQuery]);

  // Coordinate Conversion Helper (Screen to Canvas World)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    return {
      x: (x - pan.x) / zoom,
      y: (y - pan.y) / zoom
    };
  };

  // 1. Mouse Wheel Zoom handler (Precision zooming focused on mouse cursor)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // World coordinate under mouse pointer before zooming
    const wx = (mx - pan.x) / zoom;
    const wy = (my - pan.y) / zoom;

    const scale = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * scale, 0.2), 4.0);

    // Calculate new pan to keep mouse pointer at the same world coordinates
    const newPanX = mx - wx * newZoom;
    const newPanY = my - wy * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // 2. Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(e);
    const nodes = nodesRef.current;

    let clickedNode: GraphNode | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = coords.x - n.x;
      const dy = coords.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= n.radius + 8) {
        clickedNode = n;
        break;
      }
    }

    if (clickedNode) {
      dragNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      dragStartPosRef.current = { x: coords.x, y: coords.y };
      
      setSelectedNode(clickedNode);
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // 3. Mouse Move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const nodes = nodesRef.current;

    if (dragNodeRef.current) {
      dragNodeRef.current.fx = coords.x;
      dragNodeRef.current.fy = coords.y;
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    let hovered: GraphNode | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = coords.x - n.x;
      const dy = coords.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= n.radius + 8) {
        hovered = n;
        break;
      }
    }
    setHoveredNode(hovered);
  };

  // 4. Mouse Up handler
  const handleMouseUp = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.fx = null;
      dragNodeRef.current.fy = null;
      dragNodeRef.current = null;
    }
    setIsPanning(false);
  };

  // Helper to trigger simulation shake/reset
  const resetLayout = () => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    nodesRef.current.forEach((n, idx) => {
      const angle = (idx / nodesRef.current.length) * Math.PI * 2;
      const radius = 120 + Math.random() * 60;
      n.x = width / 2 + Math.cos(angle) * radius;
      n.y = height / 2 + Math.sin(angle) * radius;
      n.vx = (Math.random() - 0.5) * 5;
      n.vy = (Math.random() - 0.5) * 5;
    });
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-300 overflow-hidden font-sans relative">
      {/* Sidebar Links */}
      <MainSidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative" ref={containerRef}>
        
        {/* Top Header */}
        <header className="relative flex items-center justify-between border-b border-zinc-800/60 px-8 py-5 bg-zinc-900/10 backdrop-blur-md shrink-0 z-10">
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight m-0 leading-none flex items-center gap-2">
              <Brain className="h-4 w-4 text-zinc-400" />
              Graphe de Connaissances
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono mt-1.5">Vue cartographique de vos cours connectés par affinité de tags</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-650" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 pl-8.5 pr-3 py-1 rounded-md border border-zinc-800 bg-zinc-950 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
              />
            </div>

            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 py-1 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 text-[10px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Réorganiser les nœuds"
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </button>
          </div>
        </header>

        {/* Dynamic Legend overlay (collapses to badge, expands on hover) */}
        <div className="absolute left-8 bottom-8 bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-md px-3 py-2.5 rounded-xl z-10 text-[10px] select-none font-mono max-w-[42px] max-h-[38px] hover:max-w-xs hover:max-h-56 transition-all duration-300 overflow-hidden cursor-pointer shadow-lg group/help text-zinc-450">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-450 shrink-0 animate-pulse" />
            <span className="font-bold text-zinc-300 uppercase tracking-wider text-[9px] whitespace-nowrap opacity-0 group-hover/help:opacity-100 transition-opacity duration-200">
              Aide & Contrôles
            </span>
          </div>
          <div className="mt-3.5 space-y-2 opacity-0 group-hover/help:opacity-100 transition-opacity duration-250 whitespace-nowrap border-t border-zinc-800/80 pt-2.5">
            <p><span className="text-zinc-200 font-semibold">Glisser Nœud</span> : Déplacer physiquement</p>
            <p><span className="text-zinc-200 font-semibold">Glisser Fond</span> : Déplacer la caméra (Pan)</p>
            <p><span className="text-zinc-200 font-semibold">Molette Souris</span> : Zoomer sur le curseur</p>
            <p><span className="text-zinc-200 font-semibold">Double-Clic Nœud</span> : Ouvrir la fiche</p>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-25">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 text-zinc-400 animate-spin mx-auto" />
              <p className="text-xs text-zinc-400 font-mono">Cartographie des modules de connaissances en cours...</p>
            </div>
          </div>
        )}

        {/* Interactive Canvas Graph */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={() => {
            if (selectedNode) {
              navigate(`/course/${selectedNode.id}`);
            }
          }}
          className="flex-1 w-full h-full bg-[#09090b] select-none cursor-grab active:cursor-grabbing"
        />

        {/* Inspector Sidebar Overlay */}
        {selectedNode && (
          <div className="absolute right-8 top-28 bottom-8 w-80 bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-lg rounded-2xl p-5 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 select-text">
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between border-b border-zinc-800/60 pb-3">
                <h3 className="text-sm font-bold text-white leading-snug">{selectedNode.label}</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-zinc-550 hover:text-white transition-colors cursor-pointer text-xs font-mono font-bold"
                >
                  ✕
                </button>
              </div>

              {selectedNode.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    Mots-clés / Domaines
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider flex items-center gap-1.5">
                  <Info className="h-3 w-3" />
                  Description pédagogique
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {selectedNode.description || "Aucune description fournie pour ce module de cours."}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/60">
              <button
                onClick={() => navigate(`/course/${selectedNode.id}`)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:text-white transition-all cursor-pointer shadow-md"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Ouvrir la fiche du cours
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Graph;
