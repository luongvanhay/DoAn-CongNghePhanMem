package com.doan.auth_service.config;

import com.doan.auth_service.model.User;
import com.doan.auth_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapRunnerTests {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private ApplicationArguments arguments;

    @Test
    void createsAdminWithEncodedPasswordWhenUsernameIsNew() {
        when(userRepository.existsByUsername("admin")).thenReturn(false);
        when(passwordEncoder.encode("long-password")).thenReturn("encoded");
        AdminBootstrapRunner runner = new AdminBootstrapRunner(
                userRepository, passwordEncoder, " admin ", "long-password");

        runner.run(arguments);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("admin", userCaptor.getValue().getUsername());
        assertEquals("encoded", userCaptor.getValue().getPassword());
        assertEquals(User.Role.ADMIN, userCaptor.getValue().getRole());
    }

    @Test
    void doesNotChangeExistingAccount() {
        when(userRepository.existsByUsername("admin")).thenReturn(true);
        AdminBootstrapRunner runner = new AdminBootstrapRunner(
                userRepository, passwordEncoder, "admin", "long-password");

        runner.run(arguments);

        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void rejectsIncompleteCredentials() {
        AdminBootstrapRunner runner = new AdminBootstrapRunner(
                userRepository, passwordEncoder, "admin", "");

        assertThrows(IllegalStateException.class, () -> runner.run(arguments));
    }

    @Test
    void rejectsShortPassword() {
        AdminBootstrapRunner runner = new AdminBootstrapRunner(
                userRepository, passwordEncoder, "admin", "short");

        assertThrows(IllegalStateException.class, () -> runner.run(arguments));
    }
}
