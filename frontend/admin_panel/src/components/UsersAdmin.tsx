import React, { type ChangeEvent, useEffect, useState } from "react";
import {
    Avatar,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axios from "axios";

// Тип пользователя
export interface UserCardData {
    id: number;
    user_id: number;
    avatar?: string;
    phone_number?: string;
    join_time?: string;
    balance?: number;
    daily_launches?: number;
    total_launches?: number;
    blocked?: boolean;
    source_param?: string; // <-- добавлено!
}

export interface OrderData {
    id: number;
    user_id: number;
    status: string;
    total_amount: number;
    created_at: string;
    updated_at?: string;
}

const randomNames = [
    "Alex", "Ivan", "Kate", "Olga", "Nikita", "Dasha", "Sergey", "Liza", "Maksim", "Anna"
];
const randomPhones = [
    "+79161234567", "+79265551234", "+79501239876", "+79851112233", "+79991115577"
];
const getRandomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

function formatDate(iso?: string) {
    if (!iso) return "-";
    const date = new Date(iso);
    return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
}

const CARD_MIN_WIDTH = 340;
const CARD_MAX_WIDTH = 600;

const AddRandomButton = ({ onClick }: { onClick: () => void }) => (
    <Tooltip title="Генерировать случайного пользователя">
        <IconButton
            onClick={onClick}
            sx={{
                background: "#FFD6DD",
                color: "#D03A3A",
                width: 56,
                height: 56,
                borderRadius: "50%",
                boxShadow: "0 4px 16px -6px #D03A3A44",
                ml: 1,
                fontSize: 32,
                ":hover": { background: "#D03A3A", color: "#fff" },
            }}
        >
            <AddIcon sx={{ fontSize: 32 }}/>
        </IconButton>
    </Tooltip>
);

const API_URL = import.meta.env.VITE_API_URL;

type SortType = "balance_desc" | "balance_asc" | "date_desc" | "date_asc" | "";

const dialogPaperSx = {
    borderRadius: 12,
    boxShadow: "0 12px 48px -16px rgb(84,133,228,0.18)",
    background: "#fff",
    p: { xs: 1.5, sm: 2.5, md: 3 },
    minWidth: { xs: "90vw", sm: 400 },
    maxWidth: 620,
};

const dialogTitleSx = {
    fontFamily: "Nunito",
    fontWeight: 700,
    fontSize: { xs: 22, md: 26 },
    pb: 0,
    color: "#5485E4",
};

const dialogActionsSx = {
    px: 3,
    pb: 2,
    gap: 1.5,
    background: "#F5F6FB",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
};

const dialogContentSx = {
    pt: 2,
    pb: 0,
    background: "#F5F6FB",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    fontFamily: "Nunito",
};

const UsersAdmin: React.FC = () => {
    const [users, setUsers] = useState<UserCardData[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortType>("");
    const [editBalanceOpen, setEditBalanceOpen] = useState(false);
    const [editUser, setEditUser] = useState<UserCardData | null>(null);
    const [newBalance, setNewBalance] = useState<number>(0);
    const [lockDialogOpen, setLockDialogOpen] = useState(false);
    const [lockUser, setLockUser] = useState<UserCardData | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteUser, setDeleteUser] = useState<UserCardData | null>(null);
    const [ordersOpen, setOrdersOpen] = useState(false);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [ordersUser, setOrdersUser] = useState<UserCardData | null>(null);

    const isMobile = useMediaQuery("(max-width:600px)");

    // Загрузка пользователей из API
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get<UserCardData[]>(
                `${API_URL}/users`,
                {
                    headers: {
                        "ngrok-skip-browser-warning": "true",
                    },
                }
            );
            setUsers(res.data);
        } catch (e) {
            console.error("Ошибка при загрузке пользователей:", e);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Генерация рандомного пользователя (только фронт)
    const handleRandomUser = () => {
        const name = randomNames[getRandomInt(0, randomNames.length - 1)];
        const phone = randomPhones[getRandomInt(0, randomPhones.length - 1)];
        const avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${name}-${getRandomInt(1, 99)}`;
        const user_id = getRandomInt(100000000, 999999999);
        const balance = getRandomInt(0, 20000) + Math.random();
        const daily_launches = getRandomInt(0, 10);
        const total_launches = getRandomInt(0, 300);
        const join_time = new Date(Date.now() - getRandomInt(0, 365) * 24 * 3600 * 1000).toISOString();
        setUsers(prev => [
            ...prev,
            {
                id: Date.now() + getRandomInt(0, 9999),
                user_id,
                avatar,
                phone_number: phone,
                join_time,
                balance,
                daily_launches,
                total_launches,
                blocked: false,
                source_param: "random", // <-- для тестов
            }
        ]);
    };

    // Открытие диалога блокировки
    const handleLockDialog = (user: UserCardData) => {
        setLockUser(user);
        setLockDialogOpen(true);
    };

    // Подтвердить блокировку/разблокировку
    const handleLockToggle = async () => {
        if (lockUser) {
            try {
                await axios.patch(`${API_URL}/users/${lockUser.user_id}/block`, {
                    blocked: !lockUser.blocked,
                }, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                await fetchUsers();
            } catch {
                alert("Ошибка при изменении статуса пользователя");
            }
        }
        setLockDialogOpen(false);
        setLockUser(null);
    };

    // Открыть диалог редактирования баланса
    const handleEditBalance = (user: UserCardData) => {
        setEditUser(user);
        setNewBalance(user.balance ?? 0);
        setEditBalanceOpen(true);
    };

    const handleBalanceChange = (e: ChangeEvent<HTMLInputElement>) => {
        setNewBalance(Number(e.target.value));
    };

    // Сохранить новый баланс
    const handleSaveBalance = async () => {
        if (editUser) {
            try {
                await axios.patch(`${API_URL}/users/${editUser.user_id}/balance`, {
                    balance: newBalance,
                }, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                await fetchUsers();
            } catch {
                alert("Ошибка при изменении баланса пользователя");
            }
        }
        setEditBalanceOpen(false);
        setEditUser(null);
    };

    // Открыть диалог удаления
    const handleDeleteDialog = (user: UserCardData) => {
        setDeleteUser(user);
        setDeleteDialogOpen(true);
    };

    // Удалить пользователя
    const handleDeleteUser = async () => {
        if (deleteUser) {
            try {
                await axios.delete(`${API_URL}/users/${deleteUser.user_id}`, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                fetchUsers();
            } catch {
                alert("Ошибка при удалении пользователя");
            }
        }
        setDeleteDialogOpen(false);
        setDeleteUser(null);
    };

    // Открыть историю заказов пользователя
    const handleOrdersOpen = async (user: UserCardData) => {
        setOrdersUser(user);
        setOrdersOpen(true);
        setOrdersLoading(true);
        try {
            const res = await axios.get<OrderData[]>(`${API_URL}/users/${user.user_id}/orders`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            setOrders(res.data);
        } catch {
            alert("Ошибка при загрузке истории заказов пользователя");
            setOrders([]);
        } finally {
            setOrdersLoading(false);
        }
    };

    // Поиск и сортировка
    const filteredUsers = users
        .filter(u =>
            u.phone_number?.toLowerCase().includes(search.toLowerCase()) ||
            String(u.user_id).includes(search) ||
            u.balance?.toFixed(2).includes(search) ||
            (u.join_time && formatDate(u.join_time).includes(search))
        );

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (sort === "balance_desc") return (Number(b.balance) || 0) - (Number(a.balance) || 0);
        if (sort === "balance_asc") return (Number(a.balance) || 0) - (Number(b.balance) || 0);
        if (sort === "date_desc")
            return new Date(b.join_time || "1970-01-01").getTime() - new Date(a.join_time || "1970-01-01").getTime();
        if (sort === "date_asc")
            return new Date(a.join_time || "1970-01-01").getTime() - new Date(b.join_time || "1970-01-01").getTime();
        return 0;
    });

    // Кнопка сортировки
    const SortButton = ({
                            active,
                            label,
                            onClick,
                            up,
                        }: {
        type: SortType;
        active: boolean;
        label: string;
        onClick: () => void;
        up?: boolean;
    }) => (
        <Tooltip title={label}>
            <IconButton
                sx={{
                    color: active ? "#5485E4" : "#848391",
                    background: active ? "#E8F0FB" : undefined,
                    mx: 0.2,
                    borderRadius: 2,
                    fontSize: 18,
                    transition: "all 0.17s",
                    ":hover": { color: "#5485E4", background: "#E8F0FB" },
                }}
                onClick={onClick}
            >
                {up ? <ArrowUpwardIcon fontSize="small"/> : <ArrowDownwardIcon fontSize="small"/>}
            </IconButton>
        </Tooltip>
    );

    // Стилизованный Dialog Wrapper
    const StyledDialog: React.FC<{
        open: boolean;
        onClose: () => void;
        title: React.ReactNode;
        actions?: React.ReactNode;
        children: React.ReactNode;
        color?: string;
        maxWidth?: "md" | "sm";
        fullWidth?: boolean;
    }> = ({ open, onClose, title, actions, children, color = "#5485E4", maxWidth = "sm", fullWidth = false }) => (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            PaperProps={{
                sx: { ...dialogPaperSx }
            }}
        >
            <DialogTitle sx={{ ...dialogTitleSx, color }}>{title}</DialogTitle>
            <DialogContent sx={dialogContentSx}>{children}</DialogContent>
            {actions && <DialogActions sx={dialogActionsSx}>{actions}</DialogActions>}
        </Dialog>
    );

    return (
        <Box sx={{ width: "100%", minHeight: "100%", px: { xs: 1, sm: 2, md: 0 }, pb: 4 }}>
            {/* Шапка: заголовок, поиск, сортировка, плюсик */}
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 3,
                    mt: 1,
                    gap: 2,
                    flexDirection: { xs: "column", md: "row" },
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: "#5485E4",
                        fontFamily: "Nunito",
                        fontWeight: 700,
                        fontSize: { xs: 26, md: 32 },
                        mb: { xs: 1, md: 0 },
                    }}
                >
                    Пользователи
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
                    {/* Поиск */}
                    <TextField
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск..."
                        variant="outlined"
                        size="small"
                        sx={{
                            background: "#F5F6FB",
                            borderRadius: 8,
                            fontFamily: "Nunito",
                            minWidth: { xs: "100%", sm: 200, md: 240 },
                            maxWidth: 300,
                            boxShadow: "0 2px 8px -4px #5485E420",
                            "& .MuiOutlinedInput-root": {
                                borderRadius: 2,
                            },
                            "& input": {
                                fontSize: 16,
                                fontWeight: 500,
                                color: "#262626",
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ color: "#5485E4" }}/>
                                </InputAdornment>
                            ),
                        }}
                    />
                    {/* Сортировки */}
                    <SortButton
                        type="balance_desc"
                        active={sort === "balance_desc"}
                        label="Баланс по убыванию"
                        onClick={() => setSort(sort === "balance_desc" ? "" : "balance_desc")}
                    />
                    <SortButton
                        type="balance_asc"
                        active={sort === "balance_asc"}
                        label="Баланс по возрастанию"
                        onClick={() => setSort(sort === "balance_asc" ? "" : "balance_asc")}
                        up
                    />
                    <SortButton
                        type="date_desc"
                        active={sort === "date_desc"}
                        label="Дата регистрации новые"
                        onClick={() => setSort(sort === "date_desc" ? "" : "date_desc")}
                    />
                    <SortButton
                        type="date_asc"
                        active={sort === "date_asc"}
                        label="Дата регистрации старые"
                        onClick={() => setSort(sort === "date_asc" ? "" : "date_asc")}
                        up
                    />
                    <AddRandomButton onClick={handleRandomUser}/>
                </Stack>
            </Box>

            {/* Загрузка */}
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
                    <CircularProgress/>
                </Box>
            ) : sortedUsers.length === 0 ? (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "60vh",
                    }}
                >
                    <Typography
                        sx={{
                            color: "#848391",
                            fontFamily: "Nunito",
                            fontSize: 20,
                            mb: 2,
                            textAlign: "center",
                        }}
                    >
                        Нет пользователей
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: `repeat(auto-fit, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
                            md: `repeat(auto-fit, minmax(${CARD_MAX_WIDTH}px, 1fr))`,
                        },
                        gap: 3,
                        justifyContent: "center",
                        alignItems: "stretch",
                        overflowX: "auto",
                        pb: 2,
                    }}
                >
                    {sortedUsers.map((user) => (
                        <Card
                            key={user.id}
                            sx={{
                                width: "100%",
                                minWidth: CARD_MIN_WIDTH,
                                maxWidth: CARD_MAX_WIDTH,
                                margin: "0 auto",
                                borderRadius: 20,
                                boxShadow: "0 8px 32px -12px rgb(84 133 228 / 17%)",
                                background: user.blocked
                                    ? "linear-gradient(90deg,#f7e7ea 0%,#ffe3e6 100%)"
                                    : "linear-gradient(90deg,#f5f7fb 0%,#e8f0fb 100%)",
                                fontFamily: "Nunito",
                                display: "flex",
                                flexDirection: isMobile ? "column" : "row",
                                overflow: "hidden",
                                alignItems: "stretch",
                                position: "relative",
                                transition: "box-shadow 0.3s, transform 0.2s",
                                border: user.blocked ? "2px solid #D03A3A33" : "2px solid #E8F0FB",
                                "&:hover": {
                                    boxShadow: "0 12px 48px -8px #5485E433",
                                    transform: "translateY(-2px) scale(1.015)",
                                },
                            }}
                        >
                            {/* Левая секция: Аватар */}
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: { xs: "100%", md: 110 },
                                    minHeight: { xs: 80, md: "100%" },
                                    background: user.blocked ? "#FFD6DD" : "#E8F0FB",
                                    p: 2,
                                }}
                            >
                                <Avatar
                                    src={user.avatar}
                                    alt={user.phone_number || ""}
                                    sx={{
                                        width: 70,
                                        height: 70,
                                        bgcolor: "#fff",
                                        fontSize: 24,
                                        boxShadow: "0 2px 8px -4px #5485E440",
                                    }}
                                />
                                <Tooltip
                                    title={user.blocked ? "Разблокировать пользователя" : "Заблокировать пользователя"}>
                                    <IconButton
                                        sx={{
                                            mt: 2,
                                            background: user.blocked ? "#D03A3A1A" : "#F5F6FB",
                                            color: user.blocked ? "#D03A3A" : "#5485E4",
                                            boxShadow: user.blocked ? "0 2px 8px -4px #D03A3A22" : "0 2px 8px -4px #5485E422",
                                            borderRadius: "50%",
                                            transition: "all 0.18s",
                                            "&:hover": {
                                                background: user.blocked ? "#D03A3A" : "#5485E4",
                                                color: "#fff",
                                            },
                                        }}
                                        onClick={() => handleLockDialog(user)}
                                    >
                                        {user.blocked ? <LockIcon/> : <LockOpenIcon/>}
                                    </IconButton>
                                </Tooltip>
                            </Box>

                            {/* Центральная секция: Инфо */}
                            <Box
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    p: { xs: 2.5, md: 3.5 },
                                    minWidth: 0,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 700,
                                        fontSize: 18,
                                        color: "#262626",
                                        mb: 0.5,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {user.phone_number || "-"}
                                </Typography>
                                <Typography sx={{ fontSize: 15, color: "#848391", }}>
                                    Регистрация: {formatDate(user.join_time)}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: 15,
                                        color: "#848391",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    TG ID: {user.user_id}
                                </Typography>
                                <Typography>
                                    <span style={{ color: "#848391" }}>Ссылка присоединения: </span>
                                    <span style={{
                                        color: "#5485E4",
                                        background: "#E8F0FB",
                                        borderRadius: "2px",
                                        padding: "2px 6px",
                                    }}>
                    {user.source_param ? user.source_param : "-"}
                  </span>
                                </Typography>
                                <Box sx={{ mt: 2, display: "flex" }}>
                                    <Chip
                                        label={`Баланс: ${user.balance?.toFixed(2) ?? "0.00"} ₽`}
                                        sx={{
                                            bgcolor: user.balance && user.balance > 0 ? "#DFF5E5" : "#F5F6FB",
                                            color: user.balance && user.balance > 0 ? "#159C5B" : "#5485E4",
                                            fontWeight: "bold",
                                            fontSize: 17,
                                            borderRadius: 2,
                                            mr: 1,
                                        }}
                                    />
                                </Box>
                                {/* Источник перехода */}
                            </Box>

                            {/* Правая секция: действия */}
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    justifyContent: "center",
                                    minWidth: 64,
                                    p: { xs: 2, md: 3 },
                                    gap: 1,
                                }}
                            >
                                <Tooltip title="История заказов">
                                    <IconButton
                                        size="small"
                                        sx={{ color: "#5485E4" }}
                                        onClick={() => handleOrdersOpen(user)}
                                    >
                                        <VisibilityIcon fontSize="small"/>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Редактировать баланс">
                                    <IconButton
                                        size="small"
                                        sx={{ color: "#5485E4" }}
                                        onClick={() => handleEditBalance(user)}
                                    >
                                        <EditIcon fontSize="small"/>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Удалить">
                                    <IconButton
                                        size="small"
                                        sx={{ color: "#D03A3A" }}
                                        onClick={() => handleDeleteDialog(user)}
                                    >
                                        <DeleteIcon fontSize="small"/>
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Диалог изменения баланса */}
            <StyledDialog
                open={editBalanceOpen}
                onClose={() => setEditBalanceOpen(false)}
                title="Изменить баланс пользователя"
                actions={
                    <>
                        <Button onClick={() => setEditBalanceOpen(false)} variant="outlined" sx={{ borderRadius: 3 }}>
                            Отмена
                        </Button>
                        <Button onClick={handleSaveBalance} variant="contained"
                                sx={{ borderRadius: 3, background: "#5485E4" }}>
                            Сохранить
                        </Button>
                    </>
                }
            >
                <Typography sx={{ mb: 2, color: "#848391" }}>
                    {editUser?.phone_number} (TG ID: {editUser?.user_id})
                </Typography>
                <TextField
                    label="Новый баланс"
                    type="number"
                    fullWidth
                    value={newBalance}
                    onChange={handleBalanceChange}
                    inputProps={{ min: 0, step: "1" }}
                    sx={{ mb: 2, fontFamily: "Nunito", background: "#fff", borderRadius: 2 }}
                />
            </StyledDialog>

            {/* Диалог подтверждения блокировки/разблокировки */}
            <StyledDialog
                open={lockDialogOpen}
                onClose={() => setLockDialogOpen(false)}
                title={lockUser?.blocked ? "Разблокировать пользователя?" : "Заблокировать пользователя?"}
                color={lockUser?.blocked ? "#159C5B" : "#D03A3A"}
                actions={
                    <>
                        <Button
                            onClick={() => setLockDialogOpen(false)}
                            variant="outlined"
                            sx={{
                                borderColor: "#848391",
                                color: "#848391",
                                fontFamily: "Nunito",
                                borderRadius: 3,
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleLockToggle}
                            variant="contained"
                            sx={{
                                background: lockUser?.blocked ? "#159C5B" : "#D03A3A",
                                color: "#fff",
                                borderRadius: 3,
                                fontFamily: "Nunito",
                            }}
                        >
                            {lockUser?.blocked ? "Разблокировать" : "Заблокировать"}
                        </Button>
                    </>
                }
            >
                <Typography sx={{ fontFamily: "Nunito", color: "#848391", mb: 1 }}>
                    {lockUser?.blocked
                        ? "Пользователь будет снова активен. Продолжить?"
                        : "Пользователь не сможет пользоваться сервисом. Продолжить?"}
                </Typography>
            </StyledDialog>

            {/* Диалог подтверждения удаления пользователя */}
            <StyledDialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title="Удалить пользователя?"
                color="#D03A3A"
                actions={
                    <>
                        <Button
                            onClick={() => setDeleteDialogOpen(false)}
                            variant="outlined"
                            sx={{
                                borderColor: "#848391",
                                color: "#848391",
                                fontFamily: "Nunito",
                                borderRadius: 3,
                            }}
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleDeleteUser}
                            variant="contained"
                            sx={{
                                background: "#D03A3A",
                                color: "#fff",
                                borderRadius: 3,
                                fontFamily: "Nunito",
                            }}
                        >
                            Удалить
                        </Button>
                    </>
                }
            >
                <Typography sx={{ fontFamily: "Nunito", color: "#848391" }}>
                    Вы уверены, что хотите удалить пользователя {deleteUser?.phone_number} (TG ID: {deleteUser?.user_id})?
                    Это действие нельзя отменить.
                </Typography>
            </StyledDialog>

            {/* Диалог истории заказов пользователя */}
            <StyledDialog
                open={ordersOpen}
                onClose={() => setOrdersOpen(false)}
                title={
                    <>
                        <span>История заказов пользователя</span>
                        <span style={{ color: "#848391", fontWeight: 400, fontSize: 18, marginLeft: 8 }}>
              {ordersUser?.phone_number} (TG ID: {ordersUser?.user_id})
            </span>
                    </>
                }
                maxWidth="md"
                fullWidth
                actions={
                    <Button onClick={() => setOrdersOpen(false)} variant="outlined" sx={{ borderRadius: 3 }}>
                        Закрыть
                    </Button>
                }
            >
                {ordersLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                        <CircularProgress/>
                    </Box>
                ) : orders.length === 0 ? (
                    <Typography sx={{ color: "#848391", textAlign: "center", fontFamily: "Nunito", my: 4 }}>
                        Заказы не найдены.
                    </Typography>
                ) : (
                    <TableContainer component={Paper}
                                    sx={{ mt: 2, boxShadow: "0 2px 12px -6px #5485E440", borderRadius: 3 }}>
                        <Table sx={{ fontFamily: "Nunito" }}>
                            <TableHead>
                                <TableRow sx={{ background: "#E8F0FB" }}>
                                    <TableCell sx={{ fontWeight: 700 }}>№ заказа</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Статус</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Сумма</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Дата создания</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Дата обновления</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orders.map(order => (
                                    <TableRow key={order.id}
                                              sx={{ background: order.status === "completed" ? "#DFF5E5" : "#fff" }}>
                                        <TableCell>{order.id}</TableCell>
                                        <TableCell>{order.status}</TableCell>
                                        <TableCell>{order.total_amount.toFixed(2)} ₽</TableCell>
                                        <TableCell>{formatDate(order.created_at)}</TableCell>
                                        <TableCell>{order.updated_at ? formatDate(order.updated_at) : "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </StyledDialog>
        </Box>
    );
};

export default UsersAdmin;