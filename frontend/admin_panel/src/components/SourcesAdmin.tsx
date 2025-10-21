import { useEffect, useState } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Paper,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const BOT_NAME = "soinshop_bot"; // Статичный ник бота

interface SourceStats {
    enter_bot: number;
    submit_phone: number;
    open_miniapp: number;
    add_to_cart: number;
    payment: number;
}

interface Source {
    id: number;
    start_param: string;
    created_at: string;
    note: string;
    visits: number;
    stats: SourceStats;
}

export default function SourcesAdmin() {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Для создания нового источника
    const [newParam, setNewParam] = useState("");
    const [newNote, setNewNote] = useState("");
    const [addLoading, setAddLoading] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; text: string; type: "success" | "error" }>({
        open: false,
        text: "",
        type: "success"
    });

    // Получение источников
    const fetchSources = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/sources`);
            setSources(Array.isArray(res.data) ? res.data : []);
            setError(null);
        } catch {
            setError("Ошибка загрузки источников");
            setSources([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSources().then();
    }, []);

    // Добавить новый источник (ссылка)
    const handleAddSource = async () => {
        if (!newParam.trim()) {
            setSnackbar({ open: true, text: "Строка ссылки не может быть пустой", type: "error" });
            return;
        }
        setAddLoading(true);
        try {
            await axios.post(`${API_URL}/sources`, {
                start_param: newParam.trim(),
                note: newNote.trim(),
            });
            setNewParam("");
            setNewNote("");
            setSnackbar({ open: true, text: "Источник успешно добавлен!", type: "success" });
            await fetchSources();
        } catch {
            setSnackbar({ open: true, text: "Ошибка при добавлении источника", type: "error" });
        } finally {
            setAddLoading(false);
        }
    };

    return (
        <Box sx={{ width: "100%", px: { xs: 1, sm: 2, md: 0 }, pb: 4 }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 3,
                    mt: 1,
                    flexWrap: "wrap",
                    gap: 2,
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: "#5485E4",
                        fontFamily: "Nunito",
                        fontWeight: 700,
                        fontSize: { xs: 26, md: 32 },
                    }}
                >
                    Источники перехода (рекламные ссылки)
                </Typography>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<RefreshIcon/>}
                    sx={{ borderRadius: 3, fontWeight: 700, height: 44 }}
                    onClick={fetchSources}
                >
                    Обновить
                </Button>
            </Box>

            {/* Форма добавления нового источника */}
            <Paper sx={{ p: 3, mb: 4, boxShadow: "0 4px 24px -12px #5485E440", borderRadius: 6 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#5485E4" }}>
                    Добавить рекламу / источник перехода
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                    <TextField
                        label="Строка ссылки (start_param)"
                        value={newParam}
                        onChange={e => setNewParam(e.target.value)}
                        sx={{ minWidth: 220, flex: 2 }}
                        disabled={addLoading}
                        placeholder="promo2024, vk_ads, tg_ads_1"
                    />
                    <TextField
                        label="Заметка (кампания, источник)"
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        sx={{ minWidth: 220, flex: 3 }}
                        disabled={addLoading}
                        placeholder="Например: ВКонтакте, Лето2024"
                    />
                    <IconButton
                        color="primary"
                        size="large"
                        onClick={handleAddSource}
                        disabled={addLoading}
                        sx={{ ml: 2 }}
                    >
                        <AddIcon/>
                    </IconButton>
                </Box>
                <Typography sx={{ mt: 2, color: "#848391" }}>
                    <b>Ссылка для отслеживания:</b> <br/>
                    <span style={{ color: "#5485E4", fontWeight: 700 }}>
            https://t.me/{BOT_NAME}?start={<span style={{
                        background: "#e8f0fb",
                        padding: "3px 8px",
                        borderRadius: 5
                    }}>{newParam || "строка"}</span>}
          </span>
                </Typography>
            </Paper>

            {/* Список источников */}
            <Paper sx={{ boxShadow: "0 4px 24px -12px #5485E440", borderRadius: 6, p: 2 }}>
                <Typography variant="h6" sx={{ m: 3, fontWeight: 700, color: "#5485E4" }}>
                    Статистика по источникам
                </Typography>
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
                        <CircularProgress/>
                    </Box>
                ) : error ? (
                    <Typography sx={{ color: "#D03A3A", mt: 2 }}>{error}</Typography>
                ) : (
                    <TableContainer>
                        <Table sx={{ minWidth: 1200 }}>
                            <TableHead>
                                <TableRow sx={{ background: "#E8F0FB" }}>
                                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Заметка</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Переходов</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Перешли в бот</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Оставили номер</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Открыли миниэпп</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Добавили в корзину</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Произвели оплату</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Ссылка для перехода</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sources.map(source => (
                                    <TableRow key={source.id}>
                                        <TableCell sx={{ fontWeight: 700 }}>{source.id}</TableCell>
                                        <TableCell>{source.note}</TableCell>
                                        <TableCell
                                            sx={{ fontWeight: 700, color: "#159C5B" }}>{source.visits}</TableCell>
                                        <TableCell>{source.stats?.enter_bot ?? 0}</TableCell>
                                        <TableCell>{source.stats?.submit_phone ?? 0}</TableCell>
                                        <TableCell>{source.stats?.open_miniapp ?? 0}</TableCell>
                                        <TableCell>{source.stats?.add_to_cart ?? 0}</TableCell>
                                        <TableCell>{source.stats?.payment ?? 0}</TableCell>
                                        <TableCell>
                      <span style={{ color: "#5485E4", fontWeight: 700 }}>
                        https://t.me/{BOT_NAME}?start={source.start_param}
                      </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
            >
                <Alert severity={snackbar.type} sx={{ width: "100%" }}>
                    {snackbar.text}
                </Alert>
            </Snackbar>
        </Box>
    );
}