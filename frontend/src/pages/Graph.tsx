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
      // Circle layout initial step
      const angle = (idx / rawNodes.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 50;
      
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 12 + Math.min(n.tags.length * 2, 8), // Larger nodes for highly tagged courses
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
    }).filter(l => l.sourceNode && l.targetNode); // Ensure integrity

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
        // A. Coulomb Repulsion (push nodes apart)
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy + 1.0; // avoid divide by zero
            const dist = Math.sqrt(distSq);

            if (dist < 400) {
              const force = (repulsion * 100) / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              // Apply negative force to n1, positive to n2
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }

        // B. Hooke's Attraction (pull linked nodes together)
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

        // C. Central Gravity (gentle force pulling toward center)
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
            // Dragged node fixed to drag position
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
      ctx.clearRect(0, 0, width, height);

      // Save standard context, apply Zoom & Pan transform
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

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
          ctx.strokeStyle = '#10b981'; // Bright emerald green trail on hover
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 8;
        } else if (isSelected) {
          ctx.strokeStyle = '#3b82f6'; // Neon blue trail for selection
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = '#27272a'; // Subtile zinc/dark border line
          ctx.lineWidth = 1.0;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0; // reset glow

      // B. DRAW NODES
      nodes.forEach(n => {
        const isHovered = hoveredNode && hoveredNode.id === n.id;
        const isSelected = selectedNode && selectedNode.id === n.id;
        const matchesSearch = searchQuery.trim() !== '' && n.label.toLowerCase().includes(searchQuery.toLowerCase());

        // Node circle filling
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        
        // Colors matching group tag
        let nodeColor = '#3f3f46'; // standard gray zinc
        if (n.tags.includes('python')) nodeColor = '#3b82f6'; // blue
        else if (n.tags.includes('rust')) nodeColor = '#ea580c'; // orange
        else if (n.tags.includes('quantique') || n.tags.includes('physique')) nodeColor = '#8b5cf6'; // violet
        else if (n.tags.includes('vulkan') || n.tags.includes('infographie')) nodeColor = '#ec4899'; // pink
        else if (n.tags.includes('web') || n.tags.includes('react')) nodeColor = '#06b6d4'; // cyan

        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Node Glow halos / highlights
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 3, 0, Math.PI * 2);
        if (isHovered) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          
          // Draw high glow highlight
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (matchesSearch) {
          ctx.strokeStyle = '#f59e0b'; // amber glow for matches
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#18181b'; // dark matching border
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        // C. DRAW LABELS
        ctx.font = isHovered ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Draw shadow/halo background for text legibility
        ctx.fillStyle = '#09090b';
        ctx.fillText(n.label, n.x - 1, n.y + n.radius + 6);
        ctx.fillText(n.label, n.x + 1, n.y + n.radius + 6);
        ctx.fillText(n.label, n.x, n.y + n.radius + 5);
        ctx.fillText(n.label, n.x, n.y + n.radius + 7);

        // Core text
        ctx.fillStyle = isHovered ? '#ffffff' : matchesSearch ? '#f59e0b' : '#a1a1aa';
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

    // Apply inverse Pan & Zoom transformations
    return {
      x: (x - pan.x) / zoom,
      y: (y - pan.y) / zoom
    };
  };

  // 1. Mouse Wheel Zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * scale, 0.2), 4.0);
    setZoom(newZoom);
  };

  // 2. Mouse Down handler (Pan OR Drag Node)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(e);
    const nodes = nodesRef.current;

    // Check if clicked near any node (within radius + 8px tolerance)
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
      // Start Dragging Node
      dragNodeRef.current = clickedNode;
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      dragStartPosRef.current = { x: coords.x, y: coords.y };
      
      setSelectedNode(clickedNode);
    } else {
      // Start Panning Canvas background
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // 3. Mouse Move handler (Drag calculations & Hover detection)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    const nodes = nodesRef.current;

    if (dragNodeRef.current) {
      // Drag update
      dragNodeRef.current.fx = coords.x;
      dragNodeRef.current.fy = coords.y;
      return;
    }

    if (isPanning) {
      // Pan update
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    // Hover detection
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

  // 4. Mouse Up handler (Stop Drag / Pan)
  const handleMouseUp = () => {
    if (dragNodeRef.current) {
      // Unlock fixed coordinates to resume physics animation
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
    <div className="flex h-screen w-screen bg-dark-950 text-dark-200 overflow-hidden font-sans relative">
      {/* Sidebar Links */}
      <MainSidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative" ref={containerRef}>
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161619_1px,transparent_1px),linear-gradient(to_bottom,#161619_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-30 pointer-events-none" />

        {/* Top Header */}
        <header className="relative flex items-center justify-between border-b border-dark-800/60 px-8 py-5 bg-dark-900/15 backdrop-blur-md shrink-0 z-10">
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight m-0 leading-none">
              <Brain className="inline-block h-4 w-4 text-emerald-400 mr-2.5 -mt-0.5" />
              Graphe de Connaissances
            </h1>
            <p className="text-[10px] text-dark-400 font-mono mt-1.5">Vue cartographique de vos cours connectés par affinité de tags</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 pl-8.5 pr-3 py-1 rounded-md border border-dark-800 bg-dark-950 text-xs text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none transition-all"
              />
            </div>

            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 py-1 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 bg-dark-900/50 text-[10px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Réorganiser les nœuds"
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </button>
          </div>
        </header>

        {/* View Controls Legend overlay */}
        <div className="absolute left-8 bottom-8 bg-dark-950/70 border border-zinc-800/80 backdrop-blur-md px-4 py-3 rounded-xl z-10 text-[10px] space-y-1.5 select-none pointer-events-none font-mono max-w-xs text-zinc-400 shadow-lg leading-relaxed">
          <p className="font-bold text-zinc-200 mb-1 flex items-center gap-1.5 uppercase tracking-wider text-[9px] border-b border-zinc-800/50 pb-1">
            <Activity className="h-3 w-3 text-emerald-400" />
            Contrôles du Graphe
          </p>
          <p><span className="text-zinc-200">Clic Gauche + Glisser</span> : Déplacer un nœud</p>
          <p><span className="text-zinc-200">Fond + Glisser</span> : Déplacer la caméra (Pan)</p>
          <p><span className="text-zinc-200">Molette de la Souris</span> : Zoom avant / arrière</p>
          <p><span className="text-zinc-200">Double-Clic Nœud</span> : Ouvrir la fiche de cours</p>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center z-25">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto" />
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
              navigate(`/courses/${selectedNode.id}`);
            }
          }}
          className="flex-1 w-full h-full bg-[#030303] select-none cursor-grab active:cursor-grabbing"
        />

        {/* Inspector Sidebar Overlay */}
        {selectedNode && (
          <div className="absolute right-8 top-28 bottom-8 w-80 bg-dark-900/85 border border-zinc-800/80 backdrop-blur-lg rounded-2xl p-5 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 select-text">
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="flex items-start justify-between border-b border-zinc-800/50 pb-3">
                <h3 className="text-sm font-bold text-white leading-snug">{selectedNode.label}</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-xs font-mono font-bold"
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
                      <span key={idx} className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
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

            <div className="pt-4 border-t border-zinc-800/50">
              <button
                onClick={() => navigate(`/courses/${selectedNode.id}`)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-950 transition-all cursor-pointer shadow-md"
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
